/**
 * Integration Tests — Dashboard monthly collection (SQLite compatible)
 */

jest.mock('../src/middleware/auth', () => (req, res, next) => {
  req.admin = { id: 'test-admin' };
  next();
});

const { Payment } = require('../src/models');
const dashboardController = require('../src/controllers/dashboardController');

function mockReqRes() {
  const req = {};
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return { req, res };
}

describe('Dashboard monthlyCollection', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns grouped monthly data from payments', async () => {
    Payment.findAll = jest.fn().mockResolvedValue([
      { payment_date: '2026-01-15', amount: '1000.00' },
      { payment_date: '2026-01-20', amount: '500.00' },
      { payment_date: '2026-02-10', amount: '2000.00' },
    ]);

    const { req, res } = mockReqRes();
    await dashboardController.monthlyCollection(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [
        { month: 'Jan 2026', total: 1500 },
        { month: 'Feb 2026', total: 2000 },
      ],
    });
  });

  test('returns empty array when no payments exist', async () => {
    Payment.findAll = jest.fn().mockResolvedValue([]);

    const { req, res } = mockReqRes();
    await dashboardController.monthlyCollection(req, res);

    expect(res.json).toHaveBeenCalledWith({ success: true, data: [] });
  });
});
