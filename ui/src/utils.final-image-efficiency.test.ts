import { describe, expect, it } from 'vitest';
import { calculateFinalImageEfficiency } from './utils';

describe('calculateFinalImageEfficiency', () => {
  it('returns 1 - (inefficientBytes / sizeBytes) for valid values', () => {
    expect(calculateFinalImageEfficiency(200, 1000)).toBeCloseTo(0.8);
  });

  it('returns 1 for zero wasted bytes', () => {
    expect(calculateFinalImageEfficiency(0, 1000)).toBe(1);
  });

  it('clamps scores below 0 when inefficient bytes exceed size', () => {
    expect(calculateFinalImageEfficiency(1500, 1000)).toBe(0);
  });

  it('returns 1 when inputs are invalid or size is non-positive', () => {
    expect(calculateFinalImageEfficiency(Number.NaN, 1000)).toBe(1);
    expect(calculateFinalImageEfficiency(200, Number.NaN)).toBe(1);
    expect(calculateFinalImageEfficiency(200, 0)).toBe(1);
    expect(calculateFinalImageEfficiency(200, -1)).toBe(1);
  });
});
