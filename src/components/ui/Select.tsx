import { SelectHTMLAttributes, ReactNode, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  children: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, children, className, ...props }, ref) => {
    return (
      <div className="form-control w-full">
        {label && (
          <label className="label">
            <span className="label-text text-slate-700">{label}</span>
          </label>
        )}
        <select
          ref={ref}
          className={cn(
            'select select-bordered w-full border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-200',
            error && 'select-error',
            className
          )}
          {...props}
        >
          {children}
        </select>
        {error && (
          <label className="label">
            <span className="label-text-alt text-error">{error}</span>
          </label>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
