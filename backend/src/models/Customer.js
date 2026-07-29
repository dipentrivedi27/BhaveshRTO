const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Customer = sequelize.define('Customer', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false,
    validate: { notEmpty: true },
  },
  contact_number: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: { notEmpty: true },
  },
  category: {
    type: DataTypes.ENUM('insurance', 'permit', 'fitness_puc', 'license'),
    allowNull: false,
  },
  vehicle_number: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  amount_total: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0 },
  },
  amount_paid: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0 },
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  needs_reminder: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Set to true by cron when end_date is within 30 days',
  },
}, {
  tableName: 'customers',
  // Virtual: amount_pending is always computed, never stored
  getterMethods: {
    amount_pending() {
      return (parseFloat(this.amount_total) - parseFloat(this.amount_paid)).toFixed(2);
    },
  },
});

module.exports = Customer;
