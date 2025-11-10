'use client';

import {
  ChevronDown,
  ChevronRight,
  CreditCard,
  FileText,
  Inbox,
  LayoutDashboard,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useFormContext } from '@/lib/forms/context';
import { useAuth } from '@/lib/auth/context';
import { BrandMark } from './BrandMark';

const navigation = [
  { name: 'ダッシュボード', href: '/dashboard', icon: LayoutDashboard },
  { name: 'フォーム管理', href: '/forms', icon: FileText },
  { name: '送信履歴', href: '/submissions', icon: Inbox },
  { name: '課金設定', href: '/billing', icon: CreditCard },
  { name: '設定', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { forms, currentForm, selectForm, loading, error } = useFormContext();
  const { user } = useAuth();

  return (
    <aside className="flex w-full flex-col rounded-[32px] border border-white/15 bg-slate-900/40 p-6 text-white shadow-[0_30px_100px_rgba(2,6,23,0.65)] backdrop-blur-2xl lg:w-72 lg:min-h-[calc(100vh-4rem)] xl:w-80">
      <div className="flex flex-col gap-4">
        <BrandMark />

        <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
          <p className="text-[10px] uppercase tracking-[0.45em] text-white/45">
            Active Form
          </p>
          {loading ? (
            <p className="mt-3 text-xs text-white/80">フォームを取得中...</p>
          ) : error ? (
            <p className="mt-3 text-xs text-rose-200">{error}</p>
          ) : forms.length === 0 ? (
            <p className="mt-3 text-xs text-white/70">フォームが登録されていません</p>
          ) : (
            <div className="relative mt-3">
              <select
                value={currentForm?.id || ''}
                onChange={(event) => selectForm(event.target.value)}
                className="w-full appearance-none rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white outline-none backdrop-blur focus:border-cyan-200 focus:ring-2 focus:ring-cyan-200/40"
              >
                {forms
                  .filter((form) => form.is_active)
                  .map((form) => (
                    <option key={form.id} value={form.id}>
                      {form.name}
                    </option>
                  ))}
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-white/60">
                <ChevronDown className="h-4 w-4" />
              </span>
            </div>
          )}
        </div>
      </div>

      <nav className="mt-8 flex-1 space-y-2">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-medium transition',
                isActive
                  ? 'border-white/30 bg-white/10 text-white shadow-[0_20px_40px_rgba(2,6,23,0.55)]'
                  : 'border-white/5 bg-white/0 text-white/70 hover:border-white/15 hover:bg-white/5 hover:text-white'
              )}
            >
              <span className="flex items-center gap-3">
                <span
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-2xl border text-white transition',
                    isActive
                      ? 'border-white/50 bg-white/20 text-white'
                      : 'border-white/15 bg-white/5 text-white/70 group-hover:border-white/30 group-hover:text-white'
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                {item.name}
              </span>
              <ChevronRight
                className={cn(
                  'h-4 w-4 transition',
                  isActive ? 'opacity-100' : 'opacity-40 group-hover:opacity-80'
                )}
              />
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 rounded-2xl border border-white/15 bg-gradient-to-br from-white/10 to-white/5 p-4">
        {user ? (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.4em] text-white/50">
              Signed in
            </p>
            <p className="text-base font-semibold text-white">
              {user.user_metadata?.name || user.email}
            </p>
            <p className="text-xs text-white/65">{user.email}</p>
          </div>
        ) : (
          <p className="text-sm text-white/70">
            ダッシュボードの利用にはログインが必要です。
          </p>
        )}
      </div>
    </aside>
  );
}
