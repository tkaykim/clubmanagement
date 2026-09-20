import test from 'node:test';
import assert from 'node:assert/strict';
import {safeAuthRedirect} from '../../lib/auth-redirect.ts';

test('login preserves local finance destination and rejects alternate origins', () => {
  const origin='https://crew.example.com';
  assert.equal(safeAuthRedirect('/finance?view=all',origin),'/finance?view=all');
  for(const value of [null,'/','//evil.example.com','/\\evil.example.com','/\n/evil.example.com','https://evil.example.com']) {
    assert.equal(safeAuthRedirect(value,origin),'/dashboard');
  }
});
