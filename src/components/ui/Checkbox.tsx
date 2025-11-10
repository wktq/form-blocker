import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  labelClassName?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, labelClassName, className, ...props }, ref) => {
    return (
      <div className="form-control">
        <label className="label cursor-pointer justify-start gap-2">
          <input
            ref={ref}
            type="checkbox"
            className={cn('checkbox checkbox-primary', className)}
            {...props}
          />
          {label && (
            <span
              className={cn(
                'text-sm font-medium text-gray-900 dark:text-gray-100',
                labelClassName
              )}
            >
              {label}
            </span>
          )}
        </label>
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
