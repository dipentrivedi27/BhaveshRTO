const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OTP = sequelize.define('OTP', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  admin_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  code: {
    type: DataTypes.STRING(6),
    allowNull: false,
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  purpose: {
    type: DataTypes.ENUM('login'),
    defaultValue: 'login',
  },
  consumed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'otps',
});

/**
 * Check if this OTP is still valid (not consumed, not expired)
 */
OTP.prototype.isValid = function () {
  return !this.consumed && new Date() < new Date(this.expires_at);
};

module.exports = OTP;
