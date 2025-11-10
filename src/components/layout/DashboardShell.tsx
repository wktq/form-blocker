'use client';

import { ReactNode } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-12">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 lg:flex-row">
        <Sidebar />
        <div className="flex-1">
          <div className="flex min-h-[calc(100vh-4rem)] flex-col rounded-[40px] border border-white/15 bg-white/95 p-6 text-slate-900 shadow-[0_35px_120px_rgba(15,23,42,0.20)] backdrop-blur-xl">
            <Header />
            <main className="flex-1 overflow-y-auto px-2 py-6">
              <div className="pb-12">{children}</div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
