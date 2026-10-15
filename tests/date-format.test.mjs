import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatLimaTimestamp } from '../lib/dashboard/format.ts';

test('timestamp has deterministic numeric formatting in Lima', () => {
  assert.equal(
    formatLimaTimestamp('2026-10-15T18:23:01.538Z'),
    '15/10/2026 · 13:23',
  );
  assert.equal(
    formatLimaTimestamp('2026-01-01T02:04:00Z'),
    '31/12/2025 · 21:04',
  );
  assert.equal(
    formatLimaTimestamp('2026-10-15T05:00:00Z'),
    '15/10/2026 · 00:00',
  );
});

test('missing and invalid timestamps have a stable fallback', () => {
  for (const value of [null, undefined, '', 'invalid'])
    assert.equal(formatLimaTimestamp(value), 'Sin fecha');
});

test('formatting ignores ICU literal punctuation and non-breaking spaces', () => {
  const original = Intl.DateTimeFormat.prototype.formatToParts;
  try {
    Intl.DateTimeFormat.prototype.formatToParts = function (date) {
      return original
        .call(this, date)
        .map((part) =>
          part.type === 'literal'
            ? { ...part, value: '\u00a0p.\u202fm.' }
            : part,
        );
    };
    assert.equal(
      formatLimaTimestamp('2026-10-15T18:23:01.538Z'),
      '15/10/2026 · 13:23',
    );
  } finally {
    Intl.DateTimeFormat.prototype.formatToParts = original;
  }
});
