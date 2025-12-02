import { NextRequest, NextResponse } from 'next/server';
import type { PostgrestError } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formId = params.id;
    if (!formId) {
      return NextResponse.json({ error: 'Form ID is required' }, { status: 400 });
    }

    const { data: form, error: formError } = await supabase
      .from('forms')
      .select('id')
      .eq('id', formId)
      .eq('user_id', user.id)
      .single();

    if (formError || !form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    const body = await request.json();
    console.log('[DEBUG] Received config update request body:', JSON.stringify(body, null, 2));

    const payload: Record<string, unknown> = {};

    if (typeof body.enable_url_detection === 'boolean') {
      payload.enable_url_detection = body.enable_url_detection;
    }

    if (typeof body.enable_paste_detection === 'boolean') {
      payload.enable_paste_detection = body.enable_paste_detection;
    }

    if (typeof body.threshold_sales === 'number') {
      payload.threshold_sales = Math.min(Math.max(body.threshold_sales, 0), 1);
    }

    if (typeof body.threshold_spam === 'number') {
      payload.threshold_spam = Math.min(Math.max(body.threshold_spam, 0), 1);
    }

    if (Array.isArray(body.banned_keywords)) {
      payload.banned_keywords = body.banned_keywords.map((keyword: unknown) =>
        typeof keyword === 'string' ? keyword : String(keyword ?? '')
      );
    }

    if (Array.isArray(body.whitelist_keywords)) {
      payload.whitelist_keywords = body.whitelist_keywords.map((keyword: unknown) =>
        typeof keyword === 'string' ? keyword : String(keyword ?? '')
      );
    }

    if (Array.isArray(body.allowed_domains)) {
      payload.allowed_domains = body.allowed_domains.map((domain: unknown) =>
        typeof domain === 'string' ? domain : String(domain ?? '')
      );
    }

    if (Array.isArray(body.blocked_domains)) {
      payload.blocked_domains = body.blocked_domains.map((domain: unknown) =>
        typeof domain === 'string' ? domain : String(domain ?? '')
      );
    }

    if (typeof body.form_selector === 'string') {
      const selector = body.form_selector.trim();
      payload.form_selector = selector.length > 0 ? selector : 'form';
    }

    console.log('[DEBUG] Constructed payload before validation:', JSON.stringify(payload, null, 2));

    if (Object.keys(payload).length === 0) {
      console.error('[DEBUG] No config fields provided in payload');
      return NextResponse.json(
        { error: 'No config fields provided' },
        { status: 400 }
      );
    }

    const executeUpsert = async (data: Record<string, unknown>) =>
      supabase
        .from('form_configs')
        .upsert(
          {
            form_id: formId,
            ...data,
          },
          { onConflict: 'form_id' }
        )
        .select('*')
        .single();

    const fallbackColumns = ['blocked_domains', 'form_selector', 'whitelist_keywords'] as const;

    let attemptPayload: Record<string, unknown> = payload;
    let config;
    let updateError: PostgrestError | null;
    let attemptCount = 0;

    while (true) {
      attemptCount++;
      console.log(`[DEBUG] Upsert attempt #${attemptCount}, payload:`, JSON.stringify(attemptPayload, null, 2));

      const result = await executeUpsert(attemptPayload);
      config = result.data;
      updateError = result.error;

      if (!updateError) {
        console.log('[DEBUG] Upsert succeeded, result:', JSON.stringify(config, null, 2));
        break;
      }

      console.error(`[DEBUG] Upsert attempt #${attemptCount} failed:`, updateError);

      const message = updateError.message || '';
      const missingColumn = fallbackColumns.find((column) =>
        message.includes(`'${column}'`)
      );

      if (missingColumn && missingColumn in attemptPayload) {
        console.log(`[DEBUG] Detected missing column '${missingColumn}', removing from payload and retrying...`);
        const { [missingColumn]: _omit, ...rest } = attemptPayload;
        attemptPayload = rest;
        continue;
      }

      console.error('[DEBUG] Cannot handle error, breaking retry loop');
      break;
    }

    if (updateError) {
      console.error('[DEBUG] Final error after all retries:', updateError);
      return NextResponse.json(
        { error: 'Failed to update form config', details: updateError.message },
        { status: 500 }
      );
    }

    console.log('[DEBUG] Returning success response with config:', JSON.stringify(config, null, 2));
    return NextResponse.json({ config });
  } catch (error) {
    console.error('Config API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
