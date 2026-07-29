const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const Admin = sequelize.define('Admin', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: { notEmpty: true },
  },
  email: {
    type: DataTypes.STRING(200),
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'admins',
  hooks: {
    beforeCreate: async (admin) => {
      // Enforce single admin
      const count = await Admin.count();
      if (count >= 1) {
        const err = new Error('Only one admin account is allowed.');
        err.status = 403;
        throw err;
      }
    },
  },
});

// Helper to verify password
Admin.prototype.verifyPassword = async function (plain) {
  return bcrypt.compare(plain, this.password_hash);
};

module.exports = Admin;
