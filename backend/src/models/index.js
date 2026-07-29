const sequelize = require('../config/database');
const Admin = require('./Admin');
const OTP = require('./OTP');
const Customer = require('./Customer');
const Payment = require('./Payment');
const MessageLog = require('./MessageLog');

// ─── Associations ────────────────────────────────────────────────────────────
Admin.hasMany(OTP, { foreignKey: 'admin_id', onDelete: 'CASCADE' });
OTP.belongsTo(Admin, { foreignKey: 'admin_id' });

Customer.hasMany(Payment, { foreignKey: 'customer_id', onDelete: 'CASCADE', as: 'payments' });
Payment.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

Customer.hasMany(MessageLog, { foreignKey: 'customer_id', onDelete: 'CASCADE', as: 'messageLogs' });
MessageLog.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

module.exports = {
  sequelize,
  Admin,
  OTP,
  Customer,
  Payment,
  MessageLog,
};
