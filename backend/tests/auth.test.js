/**
 * Unit Tests — Auth & Single-Admin Enforcement
 *
 * These tests run without a real DB by mocking Sequelize models.
 */

// Mock the models so we never touch a real DB
jest.mock('../src/models', () => {
  const admin = {
    count: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
    findByPk: jest.fn(),
  };
  const otp = {
    create: jest.fn(),
    update: jest.fn(),
    findOne: jest.fn(),
  };
  return { Admin: admin, OTP: otp };
});

jest.mock('../src/services/emailService', () => ({
  sendOTPEmail: jest.fn().mockResolvedValue({}),
}));

const { Admin, OTP } = require('../src/models');
const authController = require('../src/controllers/authController');

// Helper to create mock req/res
function mockReqRes(body = {}) {
  const req = { body };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return { req, res };
}

describe('Single-Admin Enforcement', () => {
  beforeEach(() => jest.clearAllMocks());

  test('adminExists returns false when no admin', async () => {
    Admin.count.mockResolvedValue(0);
    const { req, res } = mockReqRes();
    await authController.adminExists(req, res);
    expect(res.json).toHaveBeenCalledWith({ exists: false });
  });

  test('adminExists returns true when admin exists', async () => {
    Admin.count.mockResolvedValue(1);
    const { req, res } = mockReqRes();
    await authController.adminExists(req, res);
    expect(res.json).toHaveBeenCalledWith({ exists: true });
  });

  test('signup succeeds when no admin exists', async () => {
    Admin.count.mockResolvedValue(0);
    Admin.create.mockResolvedValue({ id: 'uuid-1', name: 'Bhavesh' });
    const { req, res } = mockReqRes({
      name: 'Bhavesh',
      email: 'bhavesh@test.com',
      password: 'secret123',
    });
    await authController.signup(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(Admin.create).toHaveBeenCalledTimes(1);
  });

  test('signup returns 403 when admin already exists', async () => {
    Admin.count.mockResolvedValue(1);
    const { req, res } = mockReqRes({
      name: 'Attacker',
      email: 'attacker@test.com',
      password: 'hack123',
    });
    await authController.signup(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(Admin.create).not.toHaveBeenCalled();
  });
});

describe('OTP Expiry Validation', () => {
  beforeEach(() => jest.clearAllMocks());

  test('verifyOTP rejects when OTP not found', async () => {
    OTP.findOne.mockResolvedValue(null);
    const { req, res } = mockReqRes({ adminId: 'uuid-1', code: '123456' });
    await authController.verifyOTP(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  test('verifyOTP rejects expired OTP', async () => {
    const expiredOTP = {
      consumed: false,
      expires_at: new Date(Date.now() - 60 * 1000), // 1 minute ago
      isValid() {
        return !this.consumed && new Date() < new Date(this.expires_at);
      },
      update: jest.fn(),
    };
    OTP.findOne.mockResolvedValue(expiredOTP);

    const { req, res } = mockReqRes({ adminId: 'uuid-1', code: '123456' });
    await authController.verifyOTP(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'OTP has expired or already been used.' })
    );
  });

  test('verifyOTP rejects consumed OTP', async () => {
    const consumedOTP = {
      consumed: true,
      expires_at: new Date(Date.now() + 60 * 1000),
      isValid() {
        return !this.consumed && new Date() < new Date(this.expires_at);
      },
      update: jest.fn(),
    };
    OTP.findOne.mockResolvedValue(consumedOTP);

    const { req, res } = mockReqRes({ adminId: 'uuid-1', code: '123456' });
    await authController.verifyOTP(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
