import { forwardRef, useId, type InputHTMLAttributes, type ReactElement, type SelectHTMLAttributes, cloneElement } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

const control =
  'h-12 w-full rounded-md bg-soft px-4 text-base text-ink transition-[box-shadow,background-color] outline-none placeholder:text-ink-muted focus:bg-card focus:ring-2 focus:ring-brand aria-invalid:ring-2 aria-invalid:ring-overdue';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(control, className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select ref={ref} className={cn(control, 'appearance-none pe-10', className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute end-4 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
    </div>
  );
});

type ControlProps = { id?: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string };

/** Label, control and message wired together for assistive technology. */
export function Field({
  label,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactElement<ControlProps>;
  className?: string;
}) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? hint;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink-muted">
        {label}
      </label>
      {cloneElement(children, { id, 'aria-invalid': !!error || undefined, 'aria-describedby': message ? messageId : undefined })}
      {message && (
        <p id={messageId} role={error ? 'alert' : undefined} className={cn('text-xs', error ? 'text-overdue' : 'text-ink-muted')}>
          {message}
        </p>
      )}
    </div>
  );
}
