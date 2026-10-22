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
      record('Provincia', 40, {
        location: ' provincia ',
      }),
    ),
    40,
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

test('lists all in-progress agencies already at their thresholds, with pending visits first', () => {
  const records = [
    record('Lima visitada', 92, { visit2: { checked: true, color: null } }),
    record('Lima pendiente', 48),
    record('Provincia pendiente', 40, { location: 'PROVINCIA' }),
    record('Esparta pendiente', 85, {
      projectId: 'esparta',
      location: 'PROVINCIA',
    }),
    record('Esparta debajo', 84, { projectId: 'esparta' }),
    record('Lima debajo', 47),
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
      ['Provincia pendiente', 40],
      ['Lima visitada', 48],
    ],
  );
});

test('includes agencies that crossed their thresholds in an older history cut', () => {
  const records = [record('Antes', 86, { projectId: 'esparta' })];
  assert.equal(progressVisitAlerts({ records, history: [] }).length, 1);
});
