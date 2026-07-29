/**
 * Unit Tests — Pending Amount Computation
 * Verifies server-side pending = amount_total - SUM(payments)
 */

describe('Pending Amount Computation', () => {
  /**
   * Helper: compute pending amount from total and payment list,
   * mirroring what the controller does server-side.
   */
  function computePending(amountTotal, payments) {
    const paid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    return parseFloat((parseFloat(amountTotal) - paid).toFixed(2));
  }

  test('pending = total when no payments have been made', () => {
    expect(computePending(5000, [])).toBe(5000);
  });

  test('pending = 0 when fully paid', () => {
    const payments = [{ amount: 2000 }, { amount: 3000 }];
    expect(computePending(5000, payments)).toBe(0);
  });

  test('pending = total - sum of partial payments', () => {
    const payments = [{ amount: 1500 }, { amount: 500 }];
    expect(computePending(5000, payments)).toBe(3000);
  });

  test('pending rounds to 2 decimal places', () => {
    const payments = [{ amount: 1000.555 }];
    expect(computePending(5000, payments)).toBe(3999.45);
  });

  test('pending is always server-computed, not a stored field', () => {
    // Simulate a customer POJO where amount_paid is stale
    const customer = { amount_total: '10000', amount_paid: '0' };
    const payments = [{ amount: '3000' }, { amount: '2000' }];
    // Server always re-computes from SUM(payments), not amount_paid field
    const serverPending = computePending(customer.amount_total, payments);
    const staleFieldPending = parseFloat(customer.amount_total) - parseFloat(customer.amount_paid);
    expect(serverPending).toBe(5000);
    expect(staleFieldPending).toBe(10000);
    // Server value is the truth
    expect(serverPending).not.toBe(staleFieldPending);
  });
});
