const MIN_ADDED_BUDGET_CENTS = 1_000_000_000n;

export interface SampleMonthPlan {
  finalBudgetCents: bigint;
  finalExpenseCents: bigint;
  sampleBudgetCents: bigint;
  sampleExpenseCents: bigint;
}

export function buildSampleMonthPlan(
  existingExpenseCents: bigint,
  existingBudgetCents: bigint,
  expenseRatioNumerator: bigint,
  expenseRatioDenominator: bigint,
): SampleMonthPlan {
  if (
    existingExpenseCents < 0n ||
    existingBudgetCents < 0n ||
    expenseRatioNumerator <= 0n ||
    expenseRatioDenominator <= 0n
  ) {
    throw new RangeError('Sample history values must be non-negative.');
  }

  const minimumBudgetForExistingExpense = ceilDivide(
    existingExpenseCents * expenseRatioDenominator,
    expenseRatioNumerator,
  );
  const finalBudgetCents = roundUpToWholeDong(
    max(
      existingBudgetCents + MIN_ADDED_BUDGET_CENTS,
      minimumBudgetForExistingExpense + MIN_ADDED_BUDGET_CENTS,
    ),
  );
  const finalExpenseCents =
    (finalBudgetCents * expenseRatioNumerator) / expenseRatioDenominator;

  return {
    finalBudgetCents,
    finalExpenseCents,
    sampleBudgetCents: finalBudgetCents - existingBudgetCents,
    sampleExpenseCents: finalExpenseCents - existingExpenseCents,
  };
}

export function decimalToCents(value: string): bigint {
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) throw new Error(`Invalid decimal money value: ${value}`);

  const sign = match[1] === '-' ? -1n : 1n;
  const whole = BigInt(match[2]);
  const fraction = BigInt((match[3] ?? '').padEnd(2, '0'));
  return sign * (whole * 100n + fraction);
}

export function centsToDecimal(value: bigint): string {
  const sign = value < 0n ? '-' : '';
  const absolute = value < 0n ? -value : value;
  const whole = absolute / 100n;
  const fraction = (absolute % 100n).toString().padStart(2, '0');
  return `${sign}${whole}.${fraction}`;
}

function ceilDivide(value: bigint, divisor: bigint): bigint {
  return (value + divisor - 1n) / divisor;
}

function roundUpToWholeDong(value: bigint): bigint {
  return ceilDivide(value, 100n) * 100n;
}

function max(left: bigint, right: bigint): bigint {
  return left > right ? left : right;
}
