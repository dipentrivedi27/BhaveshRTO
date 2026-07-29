const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MessageLog = sequelize.define('MessageLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  customer_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  category: {
    type: DataTypes.ENUM('insurance', 'permit', 'fitness_puc', 'license'),
    allowNull: false,
  },
  message_body: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  sent_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  status: {
    type: DataTypes.ENUM('sent', 'failed', 'stub'),
    defaultValue: 'stub',
  },
  provider_response: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'message_logs',
});

module.exports = MessageLog;
