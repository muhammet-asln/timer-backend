import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const StudySession = sequelize.define('StudySession', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  session_type: {
    type: DataTypes.ENUM('pomodoro', 'stopwatch', 'timer'),
    allowNull: false,
    comment: 'pomodoro: Pomodoro döngüsü, stopwatch: İleri sayım, timer: Geri sayım'
  },
  duration_seconds: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    },
    comment: 'Toplam çalışma süresi saniye cinsinden'
  },
  subject: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Çalışılan konu (opsiyonel)'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: 'Kayıt oluşturma tarihi (istatistikler için kritik)'
  }
}, {
  tableName: 'study_sessions',
  timestamps: false,
  indexes: [
    {
      name: 'idx_study_sessions_user_id',
      fields: ['user_id']
    },
    {
      name: 'idx_study_sessions_created_at',
      fields: ['created_at']
    }
  ]
});

// ==========================================================
// BU KISIM TAMAMEN SİLİNDİ
// Relations
// StudySession.belongsTo(User, { ... });
// User.hasMany(StudySession, { ... });
// ==========================================================


// Instance method to format duration
StudySession.prototype.getFormattedDuration = function() {
  const hours = Math.floor(this.duration_seconds / 3600);
  const minutes = Math.floor((this.duration_seconds % 3600) / 60);
  const seconds = this.duration_seconds % 60;
  
  return {
    hours,
    minutes,
    seconds,
    formatted: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  };
};

export default StudySession;
