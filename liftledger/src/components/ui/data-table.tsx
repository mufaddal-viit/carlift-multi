import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  align?: 'start' | 'end';
  /** Shown as the heading of the stacked card on small screens. */
  primary?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty: ReactNode;
  caption: string;
}

/** A table from the `md` breakpoint up, and a list of stacked cards on phones. */
export function DataTable<T>({ columns, rows, rowKey, empty, caption }: DataTableProps<T>) {
  if (rows.length === 0) return <div className="py-10 text-center text-sm text-ink-muted">{empty}</div>;
  const primary = columns.find((c) => c.primary) ?? columns[0];
  const rest = columns.filter((c) => c !== primary);

  return (
    <>
      <table className="hidden w-full border-separate border-spacing-0 text-sm md:table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cn('px-3 pb-3 text-xs font-medium text-ink-muted', c.align === 'end' ? 'text-end' : 'text-start')}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="group">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    'px-3 py-3 align-middle transition-colors group-hover:bg-soft first:rounded-s-inner last:rounded-e-inner',
                    c.align === 'end' ? 'text-end' : 'text-start',
                  )}
                >
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="flex flex-col gap-2 md:hidden" aria-label={caption}>
        {rows.map((row) => (
          <li key={rowKey(row)} className="rounded-inner bg-soft p-3.5">
            <div className="mb-2">{primary.cell(row)}</div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
              {rest.map((c) => (
                <div key={c.key} className="min-w-0">
                  <dt className="text-[11px] text-ink-muted">{c.header}</dt>
                  <dd className="truncate">{c.cell(row)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
