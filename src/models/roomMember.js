import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const RoomMember = sequelize.define('RoomMember', {
  user_id: {
    type: DataTypes.INTEGER,
    primaryKey: true, // Kompozit anahtarın parçası
    references: {
      model: 'users',
      key: 'id'
    }
  },
  room_id: {
    type: DataTypes.INTEGER,
    primaryKey: true, // Kompozit anahtarın parçası
    references: {
      model: 'rooms',
      key: 'id'
    }
  },
  joined_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  current_status: {
    type: DataTypes.ENUM('idle', 'working', 'break'),
    defaultValue: 'idle'
  },
  current_subject: {
    type: DataTypes.STRING(100),
    allowNull: true
  }
}, {
  tableName: 'room_members',
  timestamps: false
});

export default RoomMember;

