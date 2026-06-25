const SCALE = 100n;

function parseMoney(value: string | number): bigint {
  const normalized = String(value).trim();
  const sign = normalized.startsWith('-') ? -1n : 1n;
  const unsigned = normalized.replace(/^-/, '');
  const [majorRaw, minorRaw = ''] = unsigned.split('.');
  const major = BigInt(majorRaw || '0') * SCALE;
  const minor = BigInt((minorRaw + '00').slice(0, 2));
  return sign * (major + minor);
}

function formatMoney(cents: bigint): string {
  const sign = cents < 0n ? '-' : '';
  const absolute = cents < 0n ? -cents : cents;
  const major = absolute / SCALE;
  const minor = absolute % SCALE;
  return `${sign}${major.toString()}.${minor.toString().padStart(2, '0')}`;
}

export function addMoney(
  left: string | number,
  right: string | number,
): string {
  return formatMoney(parseMoney(left) + parseMoney(right));
}

export function subtractMoney(
  left: string | number,
  right: string | number,
): string {
  return formatMoney(parseMoney(left) - parseMoney(right));
}

export function negateMoney(value: string | number): string {
  return formatMoney(-parseMoney(value));
}

export function compareMoney(
  left: string | number,
  right: string | number,
): -1 | 0 | 1 {
  const diff = parseMoney(left) - parseMoney(right);
  if (diff === 0n) return 0;
  return diff > 0n ? 1 : -1;
}
