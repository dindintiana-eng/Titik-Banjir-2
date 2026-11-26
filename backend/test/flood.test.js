const test = require('node:test');
const assert = require('node:assert/strict');
const { RISK, getRiskLevel, getAccessAdvice } = require('../src/domain/flood');

test('classifies safe, warning, and danger values at the agreed boundaries', () => {
  assert.equal(getRiskLevel(14.99, 0.99), RISK.SAFE);
  assert.equal(getRiskLevel(15, 0.5), RISK.WARNING);
  assert.equal(getRiskLevel(10, 1), RISK.WARNING);
  assert.equal(getRiskLevel(30, 0), RISK.DANGER);
  assert.equal(getRiskLevel(10, 3), RISK.DANGER);
});

test('does not classify missing measurements as safe', () => {
  assert.equal(getRiskLevel(null, 0.5), RISK.UNKNOWN);
  assert.equal(getRiskLevel(10, undefined), RISK.UNKNOWN);
  assert.equal(getRiskLevel(30, undefined), RISK.DANGER);
});

test('recommends stopping delivery for dangerous or closed roads', () => {
  assert.equal(getAccessAdvice(RISK.DANGER, 'Tergenang'), 'Hentikan pengiriman sementara');
  assert.equal(getAccessAdvice(RISK.SAFE, 'Jalan ditutup'), 'Hentikan pengiriman sementara');
});
