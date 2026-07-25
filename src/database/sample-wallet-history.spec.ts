import {
  buildSampleMonthPlan,
  centsToDecimal,
  decimalToCents,
} from './sample-wallet-history';

describe('sample wallet history plan', () => {
  it('builds an April total that is exactly 68 percent over budget', () => {
    const plan = buildSampleMonthPlan(0n, 0n, 168n, 100n);

    expect(plan.finalExpenseCents * 100n).toBe(plan.finalBudgetCents * 168n);
    expect(plan.sampleBudgetCents).toBeGreaterThan(0n);
    expect(plan.sampleExpenseCents).toBeGreaterThan(0n);
  });

  it('builds a May total that saves exactly 20 percent', () => {
    const plan = buildSampleMonthPlan(
      decimalToCents('9000000.00'),
      decimalToCents('5000000.00'),
      80n,
      100n,
    );

    expect(plan.finalExpenseCents * 100n).toBe(plan.finalBudgetCents * 80n);
    expect(centsToDecimal(plan.finalBudgetCents)).toMatch(/\.00$/);
  });
});
