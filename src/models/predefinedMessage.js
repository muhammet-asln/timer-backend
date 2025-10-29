import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const PredefinedMessage = sequelize.define('PredefinedMessage', {
  message_key: {
    type: DataTypes.STRING(50),
    primaryKey: true
  },
  content: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  message_type: {
    type: DataTypes.STRING(50),
    allowNull: true
  }
}, {
  tableName: 'predefined_messages',
  timestamps: false
});

export default PredefinedMessage;
