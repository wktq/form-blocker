'use client';

import { useFormStore } from '@/lib/store';
import { copyToClipboard } from '@/lib/utils';
import { useState } from 'react';

export function Header() {
  const [copied, setCopied] = useState(false);
  const { currentForm } = useFormStore();

  const handleCopy = async () => {
    if (!currentForm) return;
    await copyToClipboard(currentForm.api_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!currentForm) {
    return (
      <header className="bg-white border-b border-gray-200">
        <div className="px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Form Blocker</h2>
            </div>
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
        </div>
      </div>
    </header>
  );
}
