import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { createClient as createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  let isAuthenticated = false;

  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    isAuthenticated = Boolean(user);
  } catch (error) {
    console.error('認証状態の確認に失敗しました', error);
  }

  if (!isAuthenticated) {
    redirect('/login');
  }

  return <DashboardShell>{children}</DashboardShell>;
}
