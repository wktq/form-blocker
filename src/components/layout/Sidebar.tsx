'use client';

import { LayoutDashboard, FileText, Inbox, Settings } from 'lucide-react';
import { useFormContext } from '@/lib/forms/context';
import { useAuth } from '@/lib/auth/context';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'ダッシュボード', href: '/dashboard', icon: LayoutDashboard },
  { name: 'フォーム管理', href: '/forms', icon: FileText },
  { name: '送信履歴', href: '/submissions', icon: Inbox },
  { name: '設定', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { forms, currentForm, selectForm, loading, error } = useFormContext();
  const { user } = useAuth();

  return (
    <aside className="w-64 bg-base-100 border-r border-base-300 min-h-screen flex flex-col">
      <div className="p-6">
        <div className="flex items-center gap-2">
          <div className="avatar placeholder">
            <div className="bg-primary text-primary-content rounded-lg w-8">
              <span className="text-sm font-bold">FB</span>
            </div>
          </div>
          <h1 className="text-xl font-bold">Form Blocker</h1>
        </div>
      </div>

      {/* フォーム選択 */}
      <div className="px-4 mb-6">
        <label className="label">
          <span className="label-text text-xs">現在のフォーム</span>
        </label>
        {loading ? (
          <div className="text-xs text-gray-500 py-2">読み込み中...</div>
        ) : error ? (
          <div className="text-xs text-red-500 py-2">{error}</div>
        ) : forms.length === 0 ? (
          <div className="text-xs text-gray-500 py-2">フォームがありません</div>
        ) : (
          <select
            value={currentForm?.id || ''}
            onChange={(e) => selectForm(e.target.value)}
            className="select select-bordered select-sm w-full"
          >
            {forms
              .filter((form) => form.is_active)
              .map((form) => (
                <option key={form.id} value={form.id}>
                  {form.name}
                </option>
              ))}
          </select>
        )}
      </div>

      {/* ナビゲーション */}
      <nav className="flex-1 px-4">
        <ul className="menu w-full space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <li key={item.name} className="w-full">
                <Link
                  href={item.href}
                  className={cn('w-full', isActive && 'active')}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ユーザーメニュー */}
      <div className="p-4 border-t border-base-300">
        {user ? (
          <div className="flex items-center gap-3">
            <div className="avatar placeholder">
              <div className="bg-neutral text-neutral-content rounded-full w-8">
                <span className="text-xs">
                  {user.email?.slice(0, 1)?.toUpperCase() || 'U'}
                </span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user.user_metadata?.name || user.email}
              </p>
              <p className="text-xs opacity-60 truncate">
                {user.email}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-500">ログインしていません</p>
        )}
      </div>
    </aside>
  );
}
