'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useFormStore } from '@/lib/store';

const navigation = [
  { name: 'ダッシュボード', href: '/dashboard', icon: '📊' },
  { name: 'フォーム管理', href: '/forms', icon: '📝' },
  { name: '送信履歴', href: '/submissions', icon: '📋' },
  { name: '設定', href: '/settings', icon: '⚙️' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { forms, currentForm, setCurrentForm } = useFormStore();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      <div className="p-6">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold">
            FB
          </div>
          <h1 className="text-xl font-bold text-gray-900">Form Blocker</h1>
        </div>
      </div>

      {/* フォーム選択 */}
      <div className="px-4 mb-6">
        <label className="block text-xs font-medium text-gray-500 mb-2">
          現在のフォーム
        </label>
        <select
          value={currentForm?.id || ''}
          onChange={(e) => {
            const form = forms.find(f => f.id === e.target.value);
            if (form) setCurrentForm(form);
          }}
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
        >
          {forms.filter(f => f.is_active).map((form) => (
            <option key={form.id} value={form.id}>
              {form.name}
            </option>
          ))}
        </select>
      </div>

      {/* ナビゲーション */}
      <nav className="flex-1 px-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* ユーザーメニュー */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-700 font-medium">
            D
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              デモユーザー
            </p>
            <p className="text-xs text-gray-500 truncate">
              demo@example.com
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
