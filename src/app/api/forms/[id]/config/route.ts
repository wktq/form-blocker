import { NextRequest, NextResponse } from 'next/server';
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

    if (Object.keys(payload).length === 0) {
      return NextResponse.json(
        { error: 'No config fields provided' },
        { status: 400 }
      );
    }

    const { data: config, error: updateError } = await supabase
      .from('form_configs')
      .update(payload)
      .eq('form_id', formId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Failed to update form config:', updateError);
      return NextResponse.json(
        { error: 'Failed to update form config' },
        { status: 500 }
      );
    }

    return NextResponse.json({ config });
  } catch (error) {
    console.error('Config API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
