/**
 * Unit Tests — 30-Day Expiry Detection (expiryHelper)
 * Uses pure JS logic, no DB connection required.
 */

const { isExpiringSoon } = require('../src/utils/expiryHelper');

describe('isExpiringSoon()', () => {
  const today = new Date();

  function daysFromNow(n) {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  test('returns true for a customer expiring today', () => {
    const customer = { end_date: daysFromNow(0) };
    expect(isExpiringSoon(customer, 30)).toBe(true);
  });

  test('returns true for a customer expiring in 15 days', () => {
    const customer = { end_date: daysFromNow(15) };
    expect(isExpiringSoon(customer, 30)).toBe(true);
  });

  test('returns true for a customer expiring in exactly 30 days', () => {
    const customer = { end_date: daysFromNow(30) };
    expect(isExpiringSoon(customer, 30)).toBe(true);
  });

  test('returns false for a customer expiring in 31 days', () => {
    const customer = { end_date: daysFromNow(31) };
    expect(isExpiringSoon(customer, 30)).toBe(false);
  });

  test('returns false for an already expired customer (past date)', () => {
    const customer = { end_date: daysFromNow(-1) };
    expect(isExpiringSoon(customer, 30)).toBe(false);
  });

  test('returns false when end_date is null', () => {
    const customer = { end_date: null };
    expect(isExpiringSoon(customer, 30)).toBe(false);
  });

  test('respects custom window (7 days)', () => {
    const customer = { end_date: daysFromNow(8) };
    expect(isExpiringSoon(customer, 7)).toBe(false);

    const customer2 = { end_date: daysFromNow(6) };
    expect(isExpiringSoon(customer2, 7)).toBe(true);
  });
});
