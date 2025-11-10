'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Form, FormConfig } from '@/types';
import { useAuth } from '@/lib/auth/context';

interface FormWithConfig extends Form {
  form_configs?: FormConfig[];
}

interface FormContextValue {
  forms: FormWithConfig[];
  currentForm: FormWithConfig | null;
  loading: boolean;
  error: string | null;
  selectForm: (formId: string) => void;
  refreshForms: () => Promise<void>;
  getConfig: (formId: string) => FormConfig | null;
}

const FormContext = createContext<FormContextValue | undefined>(undefined);

async function fetchForms(): Promise<FormWithConfig[]> {
  const response = await fetch('/api/forms', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = typeof body?.error === 'string' ? body.error : response.statusText;
    throw new Error(message || 'フォーム情報の取得に失敗しました');
  }

  const data = await response.json();
  return data.forms ?? [];
}

export function FormProvider({ children }: { children: React.ReactNode }) {
  const [forms, setForms] = useState<FormWithConfig[]>([]);
  const [currentFormId, setCurrentFormId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();

  const loadForms = useCallback(async () => {
    if (!user) {
      setForms([]);
      setCurrentFormId(null);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await fetchForms();
      setForms(result);
      if (result.length > 0 && !currentFormId) {
        setCurrentFormId(result[0].id);
      } else if (result.length === 0) {
        setCurrentFormId(null);
      } else if (currentFormId && !result.some((form) => form.id === currentFormId)) {
        setCurrentFormId(result[0]?.id ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'フォームの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [currentFormId, user]);

  useEffect(() => {
    if (authLoading) return;
    void loadForms();
  }, [authLoading, loadForms]);

  const currentForm = useMemo(() => {
    if (!currentFormId) return null;
    return forms.find((form) => form.id === currentFormId) ?? null;
  }, [currentFormId, forms]);

  const getConfig = useCallback(
    (formId: string): FormConfig | null => {
      const form = forms.find((item) => item.id === formId);
      if (!form || !form.form_configs?.length) return null;
      return form.form_configs[0];
    },
    [forms]
  );

  const value = useMemo<FormContextValue>(
    () => ({
      forms,
      currentForm,
      loading,
      error,
      selectForm: (formId: string) => setCurrentFormId(formId),
      refreshForms: loadForms,
      getConfig,
    }),
    [forms, currentForm, loading, error, loadForms, getConfig]
  );

  return <FormContext.Provider value={value}>{children}</FormContext.Provider>;
}

export function useFormContext() {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useFormContext must be used within FormProvider');
  }
  return context;
}
