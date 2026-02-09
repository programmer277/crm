export const trim = ({ value }: { value: unknown }) => {
  return typeof value === 'string' ? value.trim() : value;
};

export const trimToUndefined = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return undefined;
  const s = value.trim();
  return s.length > 0 ? s : undefined;
};

export const toInt = ({ value }: { value: unknown }) => {
  if (value === null || value === undefined || value === '') return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
};
