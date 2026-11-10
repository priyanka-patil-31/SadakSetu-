/**
 * Systematic CSV export and printable report utilities for SadakSetu.
 * Handles proper escaping, UTF-8 BOM encoding for Excel, date formatting,
 * and clean print layouts.
 */

export interface CsvExportOptions {
  filename: string
  headers: string[]
  rows: (string | number | boolean | null | undefined)[][]
}

export function downloadCsv({ filename, headers, rows }: CsvExportOptions) {
  const sanitize = (val: string | number | boolean | null | undefined): string => {
    if (val === null || val === undefined) return '""'
    const str = String(val).replace(/"/g, '""')
    return `"${str}"`
  }

  const csvContent = [
    headers.map(sanitize).join(','),
    ...rows.map((row) => row.map(sanitize).join(',')),
  ].join('\r\n')

  // \uFEFF is UTF-8 Byte Order Mark (BOM) so Excel opens UTF-8 text with proper encoding
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export interface PrintReportOptions {
  title: string
  subtitle?: string
  dateRange?: string
  filters?: Record<string, string>
  summaryCards?: { label: string; value: string | number }[]
  headers: string[]
  rows: (string | number | null | undefined)[][]
}

export function printTableReport(options: PrintReportOptions) {
  const printWindow = window.open('', '_blank', 'width=900,height=700')
  if (!printWindow) {
    window.print()
    return
  }

  const generatedDate = new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date())

  const filtersHtml = options.filters
    ? `<div class="filters">
        ${Object.entries(options.filters)
          .map(([k, v]) => `<span><strong>${k}:</strong> ${v}</span>`)
          .join(' · ')}
      </div>`
    : ''

  const summaryHtml = options.summaryCards
    ? `<div class="summary-grid">
        ${options.summaryCards
          .map(
            (c) => `<div class="summary-card">
              <div class="summary-label">${c.label}</div>
              <div class="summary-val">${c.value}</div>
            </div>`
          )
          .join('')}
      </div>`
    : ''

  const tableRowsHtml = options.rows
    .map(
      (r, idx) => `<tr>
        <td class="num">${idx + 1}</td>
        ${r.map((cell) => `<td>${cell ?? '—'}</td>`).join('')}
      </tr>`
    )
    .join('')

  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${options.title} - SadakSetu Report</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #1e293b; margin: 0; padding: 16px; font-size: 11px; }
    .header { border-bottom: 2px solid #0d9488; padding-bottom: 10px; margin-bottom: 12px; }
    .badge { display: inline-block; background: #f0fdfa; color: #0d9488; font-size: 9px; font-weight: 700; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; border: 1px solid #ccfbf1; }
    h1 { margin: 6px 0 2px 0; font-size: 18px; color: #0f172a; }
    .meta { font-size: 10px; color: #64748b; }
    .filters { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; margin: 8px 0; font-size: 10px; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; margin: 10px 0 14px 0; }
    .summary-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; text-align: center; }
    .summary-label { font-size: 9px; color: #64748b; font-weight: 600; text-transform: uppercase; }
    .summary-val { font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: #f1f5f9; color: #334155; font-weight: 700; text-align: left; padding: 6px 8px; border: 1px solid #cbd5e1; font-size: 10px; }
    td { padding: 6px 8px; border: 1px solid #e2e8f0; }
    tr:nth-child(even) { background: #f8fafc; }
    td.num { width: 24px; text-align: center; color: #94a3b8; font-weight: 600; }
    .footer { margin-top: 14px; text-align: right; font-size: 9px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="header">
    <span class="badge">SadakSetu Municipal Road Governance</span>
    <h1>${options.title}</h1>
    <div class="meta">${options.subtitle ?? 'Official Incident & Operational Safety Record'} · Generated on ${generatedDate} ${options.dateRange ? `· Period: ${options.dateRange}` : ''}</div>
  </div>
  ${filtersHtml}
  ${summaryHtml}
  <table>
    <thead>
      <tr>
        <th class="num">#</th>
        ${options.headers.map((h) => `<th>${h}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${tableRowsHtml || '<tr><td colspan="' + (options.headers.length + 1) + '" style="text-align:center;padding:16px;">No records found.</td></tr>'}
    </tbody>
  </table>
  <div class="footer">SadakSetu Platform · Total Records: ${options.rows.length}</div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 250);
    };
  </script>
</body>
</html>`)
  printWindow.document.close()
}
