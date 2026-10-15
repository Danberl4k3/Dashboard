import { test } from 'node:test';
import assert from 'node:assert/strict';
import { latestHalfwayMilestones } from '../lib/dashboard/milestones.ts';

const record = (agency, progress, status = 'En proceso', projectId = 'p1') => ({
  id: agency,
  projectId,
  agency,
  progress,
  status,
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
    latestHalfwayMilestones(snapshot).map(({ record }) => record.agency),
    ['A', 'B'],
  );
});

test('ignores earlier crossings, finished agencies, and missing prior cuts', () => {
  const snapshot = {
    records: [record('Old', 55), record('Done', 100, 'Terminada'), record('New', 55)],
    history: [
      entry('Old', '01/10', 40),
      entry('Done', '01/10', 40),
      entry('Old', '02/10', 55),
      entry('Done', '02/10', 100),
      entry('New', '03/10', 55),
    ],
  };
  assert.deepEqual(latestHalfwayMilestones(snapshot), []);
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
    latestHalfwayMilestones(snapshot).map(({ record }) => record.agency),
    ['B'],
  );
});
