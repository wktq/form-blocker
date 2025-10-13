'use client';

import { useFormStore } from '@/lib/store';
import { useAuth } from '@/lib/auth/context';
import { copyToClipboard } from '@/lib/utils';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';

export function Header() {
  const [copied, setCopied] = useState(false);
  const { currentForm } = useFormStore();
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

  if (!currentForm) {
    return (
      <header className="bg-white border-b border-gray-200">
        <div className="px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Form Blocker</h2>
            </div>
            {user && (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">{user.email}</span>
                <Button variant="secondary" onClick={handleSignOut} size="sm">
                  ログアウト
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {currentForm.name}
            </h2>
            <div className="flex items-center space-x-3 mt-1">
              <span className="text-sm text-gray-500">{currentForm.site_url}</span>
              <span className="text-gray-300">•</span>
              <code className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                {currentForm.api_key}
              </code>
              <button
                onClick={handleCopy}
                className="text-xs text-primary-600 hover:text-primary-700"
              >
                {copied ? '✓ コピー済み' : 'コピー'}
              </button>
            </div>
          </div>
          {user && (
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user.email}</span>
              <Button variant="secondary" onClick={handleSignOut} size="sm">
                ログアウト
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
