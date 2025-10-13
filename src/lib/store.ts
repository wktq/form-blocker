import { create } from 'zustand';
import { User, Form, FormConfig } from '@/types';
import { mockUser, mockForms, mockFormConfigs } from './mock-data';

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: mockUser,
  isAuthenticated: true,
  signIn: async (email: string, password: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    set({ user: mockUser, isAuthenticated: true });
  },
  signOut: () => {
    set({ user: null, isAuthenticated: false });
  },
}));

interface FormStore {
  forms: Form[];
  currentForm: Form | null;
  formConfigs: Record<string, FormConfig>;
  setCurrentForm: (form: Form) => void;
  getCurrentFormConfig: () => FormConfig | null;
  updateFormConfig: (formId: string, config: Partial<FormConfig>) => void;
}

export const useFormStore = create<FormStore>((set, get) => ({
  forms: mockForms,
  currentForm: mockForms[0],
  formConfigs: mockFormConfigs,
  setCurrentForm: (form: Form) => {
    set({ currentForm: form });
  },
  getCurrentFormConfig: () => {
    const { currentForm, formConfigs } = get();
    if (!currentForm) return null;
    return formConfigs[currentForm.id] || null;
  },
  updateFormConfig: (formId: string, config: Partial<FormConfig>) => {
    set((state) => ({
      formConfigs: {
        ...state.formConfigs,
        [formId]: {
          ...state.formConfigs[formId],
          ...config,
        },
      },
    }));
  },
}));
