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
      record('Desde 35', 35, { provider: ' prosegur ', location: ' provincia ' }),
      record('Sobre 35', 39, { location: 'PROVINCIA' }),
      record('Final', 100, { location: 'PROVINCIA' }),
      record('Otro proveedor', 35, { provider: 'DOMINION', location: 'PROVINCIA' }),
    ],
    history: [],
  });
  assert.deepEqual(
    alerts.map(({ record, threshold, kind }) => [record.agency, threshold, kind]),
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
