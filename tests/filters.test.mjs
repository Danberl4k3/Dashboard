import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withoutDya } from '../lib/dashboard/filters.ts';

test('withoutDya filters DYA records and matching history', () => {
  const snapshot = {
    records: [
      { provider: 'DYA', projectId: 'p1', agency: 'DYA Norte' },
      { provider: 'REG', projectId: 'p1', agency: 'Agencia A' },
    ],
    history: [
      { projectId: 'p1', agency: 'DYA Norte' },
      { projectId: 'p1', agency: 'Agencia A' },
    ],
  };
  const result = withoutDya(snapshot);
  assert.deepEqual(
    result.records.map((r) => r.agency),
    ['Agencia A'],
  );
  assert.deepEqual(
    result.history.map((h) => h.agency),
    ['Agencia A'],
  );
});
