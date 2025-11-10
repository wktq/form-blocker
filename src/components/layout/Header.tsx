'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { copyToClipboard } from '@/lib/utils';
import { useAuth } from '@/lib/auth/context';
import { useFormContext } from '@/lib/forms/context';

export function Header() {
  const [copied, setCopied] = useState(false);
  const { currentForm } = useFormContext();
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleCopy = async () => {
    if (!currentForm) return;
    await copyToClipboard(currentForm.api_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <header className="rounded-[28px] border border-slate-200/70 bg-white/90 px-6 py-6 shadow-[0_25px_60px_rgba(148,163,184,0.25)] backdrop-blur">
      {currentForm ? (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.45em] text-slate-500">
              Active Form
            </p>
            <h2 className="mt-2 font-display text-3xl text-slate-900">
              {currentForm.name}
            </h2>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-900/5 px-3 py-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                {currentForm.site_url}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 font-mono text-xs text-slate-700">
                {currentForm.api_key}
              </span>
              <button
                onClick={handleCopy}
                className="text-xs font-semibold text-slate-700 underline decoration-dotted decoration-slate-300 transition hover:text-slate-900"
              >
                {copied ? '✓ コピー済み' : 'APIキーをコピー'}
              </button>
            </div>
          </div>
          {user && (
            <div className="flex flex-col items-start gap-3 text-left sm:flex-row sm:items-center sm:text-right">
              <div className="text-sm text-slate-500">
                <p className="font-semibold text-slate-900">
                  {user.user_metadata?.name || user.email}
                </p>
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
                  管理者
                </p>
              </div>
              <Button variant="secondary" onClick={handleSignOut} size="sm">
                ログアウト
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mt-1 text-sm text-slate-600">
              まずはフォームを選択してください。
            </p>
          </div>
          {user && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">{user.email}</span>
              <Button variant="secondary" onClick={handleSignOut} size="sm">
                ログアウト
              </Button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
