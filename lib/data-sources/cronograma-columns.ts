import type { XlsxSheet } from './xlsx-reader';

export function cronogramaScheduleColumns(sheet: XlsxSheet) {
  const columns = { cameras: 21, startDate: 22, endDate: 23, days: 24 };
  const aliases = {
    cameras: ['TOTAL FINAL CAMARAS'],
    startDate: ['FECHA DE INICIO', 'FECHA INICIO'],
    endDate: ['FECHA TERMINO', 'FECHA DE TERMINO', 'FECHA FIN', 'FECHA DE FIN'],
    days: ['DIAS'],
  };
  const found = new Set<string>();
  for (let row = 1; row <= Math.min(20, sheet.maxRow); row++) {
    for (let col = 1; col <= 30; col++) {
      const header = String(sheet.get(row, col) ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Z0-9]+/gi, ' ')
        .trim()
        .toUpperCase();
      for (const key of Object.keys(aliases) as Array<keyof typeof aliases>) {
        if (!found.has(key) && aliases[key].includes(header)) {
          columns[key] = col;
          found.add(key);
        }
      }
    }
  }
  return columns;
}
