/** Rows to CSV text: every field quoted when it holds a comma, quote or line break, as spreadsheets expect. */
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  const field = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? '' : String(v);
    // A leading = + - @ would run as a formula in Excel; a leading apostrophe keeps it as text.
    const safe = /^[=+\-@]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s) ? `'${s}` : s;
    return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return rows.map((r) => r.map(field).join(',')).join('\r\n');
}

/** Saves CSV text as a file. The byte-order mark makes Excel read Arabic names correctly. */
export function downloadCsv(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
