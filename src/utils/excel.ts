// src/utils/excel.ts

export const loadSheetJS = (): Promise<any> => {
  return new Promise((resolve) => {
    if ((window as any).XLSX) return resolve((window as any).XLSX);
    const existing = document.getElementById('sheetjs-cdn');
    if (existing) {
      existing.addEventListener('load', () => resolve((window as any).XLSX));
      return;
    }
    const script = document.createElement('script');
    script.id = 'sheetjs-cdn';
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    script.onload = () => resolve((window as any).XLSX);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
};

export const downloadExcelTemplate = async (filename: string, headers: string[], sampleRows: string[][]) => {
  const XLSX = await loadSheetJS();
  if (XLSX) {
    const wsData = [headers, ...sampleRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const colWidths = headers.map((h, i) => {
      let maxLen = h.length;
      sampleRows.forEach(row => {
        if (row[i] && row[i].length > maxLen) maxLen = row[i].length;
      });
      return { wch: Math.max(maxLen + 4, 14) };
    });
    ws['!cols'] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
  } else {
    const csvRows = [
      headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
      ...sampleRows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ];
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename.replace('.xlsx', '.csv'));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};