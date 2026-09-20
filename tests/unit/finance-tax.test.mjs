import assert from "node:assert/strict";
import test from "node:test";

const { calculateFinanceTax, FINANCE_TAX_POLICY_VERSION } = await import("../../lib/finance.ts");

test("business-income tax calculation uses exact integer won arithmetic", () => {
  for (const grossAmount of [0, 1, 33, 34, 99, 100, 300000, 9007199254740991]) {
    const incomeTaxAmount = Number((BigInt(grossAmount) * 3n) / 100n);
    const localIncomeTaxAmount = Math.floor(incomeTaxAmount / 10);
    assert.deepEqual(calculateFinanceTax(grossAmount, "business_income_3_3"), {
      taxableAmount: grossAmount,
      incomeTaxAmount,
      localIncomeTaxAmount,
      deductionAmount: incomeTaxAmount + localIncomeTaxAmount,
      netAmount: grossAmount - incomeTaxAmount - localIncomeTaxAmount,
      policyVersion: FINANCE_TAX_POLICY_VERSION,
    });
  }
});

test("explicit non-withholding tax types retain the gross amount", () => {
  for (const type of ["none", "invoice"])
    assert.equal(calculateFinanceTax(300000, type).netAmount, 300000);
});

test("tax calculation rejects undecided, fractional, and unsafe won values", () => {
  assert.throws(() => calculateFinanceTax(100, "undecided"), /decided/);
  assert.throws(() => calculateFinanceTax(100.5, "none"), /safe integer/);
  assert.throws(() => calculateFinanceTax(Number.MAX_SAFE_INTEGER + 1, "none"), /safe integer/);
});
