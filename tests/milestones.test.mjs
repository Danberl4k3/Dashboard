import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  progressAlertThreshold,
  progressVisitAlerts,
} from '../lib/dashboard/milestones.ts';

const record = (agency, progress, overrides = {}) => ({
  id: agency,
  projectId: '3979',
  agency,
  progress,
  status: 'En proceso',
  provider: 'PROSEGUR',
  location: 'LIMA',
  visit2: { checked: false, color: null },
  visit3: { checked: false, color: null },
  ...overrides,
});

test('Esparta 2 takes precedence over province and Prosegur', () => {
  assert.equal(
    progressAlertThreshold(
      record('Esparta', 85, {
        projectId: 'esparta',
        provider: 'PROSEGUR',
        location: 'PROVINCIA',
      }),
    ),
    85,
  );
  assert.equal(
    progressAlertThreshold(
      record('Provincia', 35, {
        location: ' provincia ',
      }),
    ),
    35,
  );
  assert.equal(
    progressAlertThreshold(
      record('Lima', 48, {
        provider: 'prosegur',
        location: ' lima ',
      }),
    ),
    48,
  );
  assert.equal(
    progressAlertThreshold(
      record('Otro', 50, {
        provider: 'DOMINION',
      }),
    ),
    50,
  );
});

test('lists eligible agencies with pending visits first', () => {
  const records = [
    record('Lima visitada', 92, { visit2: { checked: true, color: null } }),
    record('Lima pendiente', 48),
    record('Provincia pendiente', 35, { location: 'PROVINCIA' }),
    record('Esparta pendiente', 85, {
      projectId: 'esparta',
      location: 'PROVINCIA',
    }),
    record('Esparta debajo', 84, { projectId: 'esparta' }),
    record('Lima debajo', 47),
    record('Otro proveedor', 99, { provider: 'DOMINION' }),
    record('Terminada', 100, { status: 'Terminada' }),
    record('Sin avance', null),
  ];
  assert.deepEqual(
    progressVisitAlerts({ records, history: [] }).map(
      ({ record, threshold }) => [record.agency, threshold],
    ),
    [
      ['Esparta pendiente', 85],
      ['Lima pendiente', 48],
      ['Provincia pendiente', 35],
      ['Terminada', 100],
      ['Lima visitada', 48],
    ],
  );
});

test('Prosegur province alerts start at 35 percent for intermediate visits', () => {
  const alerts = progressVisitAlerts({
    records: [
      record('Debajo', 34.99, { location: 'PROVINCIA' }),
      record('Desde 35', 35, {
        provider: ' prosegur ',
        location: ' provincia ',
      }),
      record('Sobre 35', 39, { location: 'PROVINCIA' }),
      record('Final', 100, { location: 'PROVINCIA' }),
      record('Otro proveedor', 35, {
        provider: 'DOMINION',
        location: 'PROVINCIA',
      }),
    ],
    history: [],
  });
  assert.deepEqual(
    alerts.map(({ record, threshold, kind }) => [
      record.agency,
      threshold,
      kind,
    ]),
    [
      ['Desde 35', 35, 'intermediate'],
      ['Final', 100, 'final'],
      ['Sobre 35', 35, 'intermediate'],
    ],
  );
});

test('separates intermediate and final visits without duplicating agencies', () => {
  const records = [
    record('Intermedia', 99),
    record('Final al 100', 100),
    record('Terminada sin avance', null, { status: 'Terminada' }),
    record('Terminada con avance menor', 95, { status: 'Terminada' }),
    record('Debajo del umbral', 47),
    record('Otro proveedor en umbral', 99, { provider: 'DOMINION' }),
  ];
  const alerts = progressVisitAlerts({ records, history: [] });
  assert.deepEqual(
    alerts.filter((a) => a.kind === 'intermediate').map((a) => a.record.agency),
    ['Intermedia'],
  );
  assert.deepEqual(
    alerts.filter((a) => a.kind === 'final').map((a) => a.record.agency),
    ['Final al 100', 'Terminada con avance menor', 'Terminada sin avance'],
  );
  assert.equal(new Set(alerts.map((a) => a.record.agency)).size, alerts.length);
});

test('only Prosegur agencies qualify for intermediate visits', () => {
  const alerts = progressVisitAlerts({
    records: [
      record('Prosegur Lima', 48),
      record('Otro proveedor', 99, { provider: 'DOMINION' }),
    ],
    history: [],
  });
  assert.deepEqual(
    alerts.map((a) => a.record.agency),
    ['Prosegur Lima'],
  );
});

test('orders final visits by Visit 3 independently of Visit 2', () => {
  const records = [
    record('A final marcada', 100, { visit3: { checked: true, color: null } }),
    record('Z final pendiente', 100, {
      visit2: { checked: true, color: null },
    }),
  ];
  assert.deepEqual(
    progressVisitAlerts({ records, history: [] }).map((a) => a.record.agency),
    ['Z final pendiente', 'A final marcada'],
  );
});

test('includes agencies that crossed their thresholds in an older history cut', () => {
  const records = [record('Antes', 86, { projectId: 'esparta' })];
  assert.equal(progressVisitAlerts({ records, history: [] }).length, 1);
});

const historyEntry = (agency, date, progress, overrides = {}) => ({
  agency,
  date,
  progress,
  projectId: '3979',
  status: 'En proceso',
  ...overrides,
});

test('identifies the first crossing in the latest project report, in calendar order', () => {
  const alerts = progressVisitAlerts({
    extractedAt: '2026-10-27T15:00:00Z',
    records: [
      record('Nueva', 50),
      record('Anterior', 60),
      record('Recruce', 50),
    ],
    history: [
      historyEntry('Nueva', '26/10', 50),
      historyEntry('Nueva', '30/09', 47),
      historyEntry('Anterior', '30/09', 48),
      historyEntry('Anterior', '26/10', 60),
      historyEntry('Recruce', '29/09', 49),
      historyEntry('Recruce', '30/09', 40),
      historyEntry('Recruce', '26/10', 50),
    ],
  });
  assert.deepEqual(
    alerts.filter((a) => a.isFirstCrossing).map((a) => a.record.agency),
    ['Nueva'],
  );
  assert.equal(alerts.length, 3);
});

test('detects current crossings after the last history cut and uses each project cutoff', () => {
  const alerts = progressVisitAlerts({
    extractedAt: '2026-10-27T15:00:00Z',
    records: [
      record('Actual', 35, { location: 'PROVINCIA' }),
      record('Nueva', 85, { projectId: 'esparta' }),
      record('Nueva', 50),
    ],
    history: [
      historyEntry('Actual', '27/10', 34),
      historyEntry('Nueva', '25/10', 84, { projectId: 'esparta' }),
      historyEntry('Nueva', '26/10', 85, { projectId: 'esparta' }),
      historyEntry('Nueva', '25/10', 48),
      historyEntry('Otra', '27/10', 0),
    ],
  });
  assert.deepEqual(
    alerts.map((a) => [a.record.projectId, a.record.agency, a.isFirstCrossing]),
    [
      ['3979', 'Actual', true],
      ['esparta', 'Nueva', true],
      ['3979', 'Nueva', false],
    ],
  );
});

test('does not claim a first crossing without sufficient valid history', () => {
  const alerts = progressVisitAlerts({
    records: [
      record('Sin historial', 50),
      record('Solo encima', 50),
      record('Fecha inválida', 50),
    ],
    history: [
      historyEntry('Solo encima', '26/10', 50),
      historyEntry('Fecha inválida', '31/02', 40),
    ],
  });
  assert.ok(alerts.every((a) => !a.isFirstCrossing));
});

test('final visits have their own first crossing, including completion with lower progress', () => {
  const alerts = progressVisitAlerts({
    records: [
      record('Nueva final', 100),
      record('Cierre', 95, { status: 'Terminada' }),
      record('Anterior final', 100),
    ],
    history: [
      historyEntry('Nueva final', '25/10', 99),
      historyEntry('Nueva final', '26/10', 100),
      historyEntry('Cierre', '25/10', 90),
      historyEntry('Cierre', '26/10', 95, { status: 'Terminada' }),
      historyEntry('Anterior final', '24/10', 99),
      historyEntry('Anterior final', '25/10', 100),
      historyEntry('Anterior final', '26/10', 100),
    ],
  });
  assert.deepEqual(
    alerts
      .filter((a) => a.isFirstCrossing)
      .map((a) => [a.record.agency, a.kind]),
    [
      ['Cierre', 'final'],
      ['Nueva final', 'final'],
    ],
  );
});

test('compares history dates across the new year without mutating history', () => {
  const history = [
    historyEntry('Nueva', '31/12', 47),
    historyEntry('Nueva', '02/01', 48),
  ];
  const original = structuredClone(history);
  const [alert] = progressVisitAlerts({
    extractedAt: '2027-01-03T15:00:00Z',
    records: [record('Nueva', 48)],
    history,
  });
  assert.equal(alert.isFirstCrossing, true);
  assert.deepEqual(history, original);
});

test('an agency missing from the latest report is not a confirmed new crossing', () => {
  const [alert] = progressVisitAlerts({
    extractedAt: '2026-10-27T15:00:00Z',
    records: [record('Sin reporte reciente', 100)],
    history: [
      historyEntry('Sin reporte reciente', '20/10', 90),
      historyEntry('Otra sede', '26/10', 20),
    ],
  });
  assert.equal(alert.isFirstCrossing, false);
});
