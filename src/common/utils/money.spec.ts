import { addMoney, compareMoney, negateMoney, subtractMoney } from './money';

describe('money utilities', () => {
  it('keeps numeric money values as fixed two-decimal strings', () => {
    expect(addMoney('1000.10', '20.05')).toBe('1020.15');
    expect(subtractMoney('1000.10', '20.05')).toBe('980.05');
    expect(negateMoney('20.05')).toBe('-20.05');
    expect(compareMoney('10.00', '9.99')).toBe(1);
  });
});
