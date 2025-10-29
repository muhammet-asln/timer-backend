import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Room = sequelize.define('Room', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  owner_id: {
    type: DataTypes.INTEGER,
    allowNull: true, // Public odalar için NULL olabilir
    references: {
      model: 'users', // 'users' tablosuna referans
      key: 'id'
    }
  },
  room_type: {
    type: DataTypes.ENUM('public', 'private'),
    allowNull: false
  },
  invite_code: {
    type: DataTypes.STRING(20),
    allowNull: true, // Public odalar için NULL
    unique: true
  },
  max_members: {
    type: DataTypes.INTEGER,
    allowNull: true // NULL = limitsiz
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'rooms',
  timestamps: false // 'created_at' manuel yönetiliyor
});

export default Room;
