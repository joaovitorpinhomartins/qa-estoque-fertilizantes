export const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;
export const isPositiveNumber = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0;
