import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEik, buildRegistryValidation } from '../src/lib/parsers/bgRegistryValidation.js';

test('validateEik accepts known valid checksums', () => {
  assert.equal(validateEik('175074752'), true);
  assert.equal(validateEik('1234567890'), false);
});

test('buildRegistryValidation normalizes BG VAT and marks VIES eligibility', () => {
  const result = buildRegistryValidation({ eik: '175074752', vatNumber: '' });
  assert.equal(result.eikValid, true);
  assert.equal(result.vatNumber, 'BG175074752');
  assert.equal(result.vatValid, true);
  assert.equal(result.viesEligible, true);
});
