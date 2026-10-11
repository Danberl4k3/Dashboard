import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  limaDate,
  recordAttention,
  recordsCsv,
  sortRecords,
} from '../lib/dashboard/tools.ts';
import { filterDashboard } from '../lib/dashboard/filters.ts';
import { cronogramaScheduleColumns } from '../lib/data-sources/cronograma-columns.ts';

const record = (overrides = {}) => ({
  id: 1,
  projectId: 'p1',
  projectLabel: 'Proyecto Uno',
  agency: 'Agencia',
  provider: 'DOMINION',
  location: 'LIMA',
  district: 'Jesús María',
  supervisor: 'José',
  status: 'No empezada',
  progress: 0,
  startDate: '2026-10-11',
  endDate: '2026-10-15',
  ...overrides,
});

test('workbooks use header-mapped dates and cameras with either column layout', () => {
  for (const offset of [0, 1]) {
    const cells = new Map([
      [21 + offset, 'TOTAL FINAL CÁMARAS'],
      [22 + offset, 'FECHA DE INICIO'],
      [23 + offset, 'FECHA TERMINO'],
      [24 + offset, 'DÍAS'],
    ]);
    const sheet = {
      maxRow: 50,
      get: (row, col) => (row === 9 ? (cells.get(col) ?? null) : null),
    };
    assert.deepEqual(cronogramaScheduleColumns(sheet), {
      cameras: 21 + offset,
      startDate: 22 + offset,
      endDate: 23 + offset,
      days: 24 + offset,
    });
  }
});

test('civil date uses Lima and never flags a scheduled start today', () => {
  const today = limaDate('2026-10-12T02:00:00Z');
  assert.equal(today, '2026-10-11');
  assert.equal(recordAttention(record(), today), null);
  assert.equal(
    recordAttention(record({ startDate: '2026-10-10' }), today),
    'late',
  );
  assert.equal(limaDate('invalid'), '');
});
test('attention distinguishes overdue in-progress, completed and unknown reports', () => {
  assert.equal(
    recordAttention(
      record({ status: 'En proceso', endDate: '2026-10-10' }),
      '2026-10-11',
    ),
    'late',
  );
  assert.equal(
    recordAttention(
      record({ status: 'Terminada', endDate: '2026-10-10' }),
      '2026-10-11',
    ),
    null,
  );
  assert.equal(
    recordAttention(record({ status: 'Sin reporte' }), '2026-10-11'),
    'unreported',
  );
  assert.equal(
    recordAttention(
      record({ startDate: '2026-02-30', endDate: null }),
      '2026-10-11',
    ),
    null,
  );
});
test('sorting keeps missing progress last in either direction and preserves input', () => {
  const rows = [
    record({ progress: null }),
    record({ progress: 60 }),
    record({ progress: 0 }),
  ];
  assert.deepEqual(
    sortRecords(rows, 'progress-up').map((r) => r.progress),
    [0, 60, null],
  );
  assert.deepEqual(
    sortRecords(rows, 'progress-down').map((r) => r.progress),
    [60, 0, null],
  );
  assert.deepEqual(
    rows.map((r) => r.progress),
    [null, 60, 0],
  );
  assert.equal(sortRecords(rows, 'original'), rows);
  assert.deepEqual(
    sortRecords(
      [record({ endDate: null }), record({ endDate: '2026-10-01' })],
      'deadline',
    ).map((r) => r.endDate),
    ['2026-10-01', null],
  );
});
test('CSV protects formulas, quotes, delimiters, line breaks and missing numeric data', () => {
  const csv = recordsCsv([
    record({
      agency: ' =HYPERLINK("evil")',
      supervisor: 'José; "Pérez"\nOtro',
      progress: null,
    }),
  ]);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"\' =HYPERLINK(""evil"")"'));
  assert.ok(csv.includes('"José; ""Pérez""\nOtro"'));
  assert.ok(!csv.includes('undefined'));
});
test('global search matches tokens across fields, accents, normalized location and excludes DYA', () => {
  const rows = [record({ location: ' LIMA ' }), record({ provider: ' DYA ' })];
  const filters = {
    project: 'Todos',
    providers: [],
    status: 'Todos',
    location: 'LIMA',
    search: 'dominion jesus jose',
  };
  assert.equal(filterDashboard(rows, filters).records.length, 1);
  assert.equal(
    filterDashboard(rows, { ...filters, search: 'noexiste' }).records.length,
    0,
  );
  assert.equal(
    filterDashboard(rows, { ...filters, search: '' }).records.length,
    1,
  );
});
