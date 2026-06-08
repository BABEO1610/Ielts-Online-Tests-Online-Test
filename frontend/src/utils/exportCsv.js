/**
 * @file exportCsv.js
 * @description Client-side CSV export for admin reports.
 */

/** Escape a single CSV cell (handles comma, quote, newline). */
const escapeCell = (val) => {
  const s = val === null || val === undefined ? '' : String(val);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * Build a CSV string and trigger a browser download.
 * @param {string} filename  e.g. "bao-cao-su-dung.csv"
 * @param {Array<{key: string, label: string}>} columns
 * @param {Array<Object>} rows
 */
export function exportToCsv(filename, columns, rows) {
  const header = columns.map((c) => escapeCell(c.label)).join(',');
  const body = rows
    .map((row) => columns.map((c) => escapeCell(row[c.key])).join(','))
    .join('\n');
  // Prepend BOM so Excel reads UTF-8 (Vietnamese) correctly.
  const csv = `\uFEFF${header}\n${body}`;

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
