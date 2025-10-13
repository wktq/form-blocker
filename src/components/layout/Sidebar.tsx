'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useFormStore } from '@/lib/store';
import { LayoutDashboard, FileText, Inbox, Settings } from 'lucide-react';

const navigation = [
  { name: 'ダッシュボード', href: '/dashboard', icon: LayoutDashboard },
  { name: 'フォーム管理', href: '/forms', icon: FileText },
  { name: '送信履歴', href: '/submissions', icon: Inbox },
  { name: '設定', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { forms, currentForm, setCurrentForm } = useFormStore();

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
        <select
          value={currentForm?.id || ''}
          onChange={(e) => {
            const form = forms.find(f => f.id === e.target.value);
            if (form) setCurrentForm(form);
          }}
          className="select select-bordered select-sm w-full"
        >
          {forms.filter(f => f.is_active).map((form) => (
            <option key={form.id} value={form.id}>
              {form.name}
            </option>
          ))}
        </select>
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
        <div className="flex items-center gap-3">
          <div className="avatar placeholder">
            <div className="bg-neutral text-neutral-content rounded-full w-8">
              <span className="text-xs">D</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              デモユーザー
            </p>
            <p className="text-xs opacity-60 truncate">
              demo@example.com
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
