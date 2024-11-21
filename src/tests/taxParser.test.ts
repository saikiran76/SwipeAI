import { describe, it, expect } from 'vitest';
import { parseTaxInfo } from '../utils/taxParser';

describe('Tax Parser', () => {
  it('should correctly parse tax string with amount and percentage', () => {
    const result = parseTaxInfo('8,115.25 (18%)');
    expect(result.amount).toBe(8115.25);
    expect(result.percentage).toBe(18);
  });

  it('should handle invalid tax string', () => {
    const result = parseTaxInfo('invalid');
    expect(result.amount).toBe(0);
    expect(result.percentage).toBe(0);
  });
}); 