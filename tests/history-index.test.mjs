import { test } from 'node:test';
import assert from 'node:assert/strict';
import { indexHistoryByAgency } from '../lib/dashboard/filters.ts';

test('indexHistoryByAgency returns Map with arrays per project::agency key', () => {
  const snapshot = {
    history: [
      { projectId: 'p1', agency: 'A' },
      { projectId: 'p1', agency: 'A' },
      { projectId: 'p2', agency: 'A' },
    ],
  };

  const result = indexHistoryByAgency(snapshot);

  assert.equal(result.size, 2);
  assert.deepEqual(result.get('p1::A'), [
    { projectId: 'p1', agency: 'A' },
    { projectId: 'p1', agency: 'A' },
  ]);
  assert.deepEqual(result.get('p2::A'), [{ projectId: 'p2', agency: 'A' }]);
});
