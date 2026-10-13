const pad = (n: number) => String(n).padStart(2, '0');

export const monthOf = (day: string) => day.slice(0, 7);

export const daysInMonth = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};

export const addMonths = (month: string, n: number) => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
};

export const lastDay = (month: string) => `${month}-${pad(daysInMonth(month))}`;

export const dueDate = (month: string, dueDay: number) =>
  `${month}-${pad(Math.min(Math.max(dueDay, 1), daysInMonth(month)))}`;
