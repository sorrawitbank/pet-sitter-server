export default function parsePositiveInt(
  value: unknown,
  defaultValue: number,
  max?: number,
): number {
  const n = Number.parseInt(String(value ?? ""), 10);
  if (Number.isNaN(n) || n <= 0) return defaultValue;
  if (max !== undefined && n > max) return max;
  return n;
}
