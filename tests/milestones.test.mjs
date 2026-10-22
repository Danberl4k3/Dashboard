import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  latestProgressMilestones,
  progressAlertThreshold,
} from '../lib/dashboard/milestones.ts';

const record = (
  agency,
  progress,
  status = 'En proceso',
  projectId = 'p1',
  overrides = {},
) => ({
  id: agency,
  projectId,
  agency,
  progress,
  status,
  provider: 'OTRO',
  location: 'LIMA',
  ...overrides,
});
const entry = (agency, date, progress, projectId = 'p1') => ({
  projectId,
  agency,
  date,
  progress,
});

test('includes agencies that reach exactly 50% or exceed it in the latest cut', () => {
  const snapshot = {
    records: [record('A', 50), record('B', 62), record('C', 70)],
    history: [
      entry('A', '01/10', 48),
      entry('B', '01/10', 49),
      entry('C', '01/10', 51),
      entry('A', '02/10', 50),
      entry('B', '02/10', 62),
      entry('C', '02/10', 70),
    ],
  };
  assert.deepEqual(
    latestProgressMilestones(snapshot).map(({ record }) => record.agency),
    ['A', 'B'],
  );
});

test('ignores earlier crossings, finished agencies, and missing prior cuts', () => {
  const snapshot = {
    records: [
      record('Old', 55),
      record('Done', 100, 'Terminada'),
      record('New', 55),
    ],
    history: [
      entry('Old', '01/10', 40),
      entry('Done', '01/10', 40),
      entry('Old', '02/10', 55),
      entry('Done', '02/10', 100),
      entry('New', '03/10', 55),
    ],
  };
  assert.deepEqual(latestProgressMilestones(snapshot), []);
});

test('uses the latest date per project and the final row of a repeated date', () => {
  const snapshot = {
    records: [record('A', 52), record('B', 51, 'En proceso', 'p2')],
    history: [
      entry('A', '01/10', 45),
      entry('A', '02/10', 49),
      entry('A', '02/10', 52),
      entry('B', '01/10', 40, 'p2'),
      entry('B', '02/10', 51, 'p2'),
      entry('A', '03/10', 52),
    ],
  };
  assert.deepEqual(
    latestProgressMilestones(snapshot).map(({ record }) => record.agency),
    ['B'],
  );
});

test('uses Esparta 2 before location, province before provider, and Prosegur Lima thresholds', () => {
  assert.equal(
    progressAlertThreshold(
      record('Esparta', 85, 'En proceso', 'esparta', {
        provider: 'PROSEGUR',
        location: 'PROVINCIA',
      }),
    ),
    85,
  );
  assert.equal(
    progressAlertThreshold(
      record('Provincia', 40, 'En proceso', '3979', {
        provider: 'PROSEGUR',
        location: ' provincia ',
      }),
    ),
    40,
  );
  assert.equal(
    progressAlertThreshold(
      record('Lima', 48, 'En proceso', '3979', {
        provider: 'prosegur',
        location: ' lima ',
      }),
    ),
    48,
  );
  assert.equal(progressAlertThreshold(record('Otro', 50)), 50);
});

test('alerts only when each agency crosses its own threshold in the latest cut', () => {
  const records = [
    record('Lima sí', 48, 'En proceso', '3979', { provider: 'PROSEGUR' }),
    record('Lima antes', 49, 'En proceso', '3979', { provider: 'PROSEGUR' }),
    record('Provincia sí', 40, 'En proceso', '3979', { location: 'PROVINCIA' }),
    record('Provincia no', 39, 'En proceso', '3979', { location: 'PROVINCIA' }),
    record('Esparta sí', 85, 'En proceso', 'esparta', {
      location: 'PROVINCIA',
    }),
    record('Esparta no', 84, 'En proceso', 'esparta', {
      location: 'PROVINCIA',
    }),
  ];
  const previous = [47, 48, 39, 38, 84, 83];
  const latest = [48, 49, 40, 39, 85, 84];
  const history = records.flatMap((item, index) => [
    entry(item.agency, '01/10', previous[index], item.projectId),
    entry(item.agency, '02/10', latest[index], item.projectId),
  ]);
  assert.deepEqual(
    latestProgressMilestones({ records, history }).map(
      ({ record, threshold }) => [record.agency, threshold],
    ),
    [
      ['Lima sí', 48],
      ['Provincia sí', 40],
      ['Esparta sí', 85],
    ],
  );
});
