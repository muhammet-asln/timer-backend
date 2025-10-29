import { sequelize } from '../config/db.js';
import User from './user.js';
import StudySession from './studySession.js';
import Room from './room.js';
import RoomMember from './roomMember.js';
import Message from './message.js';
import PredefinedMessage from './predefinedMessage.js';

// Tüm modelleri bir araya getir
const models = {
  User,
  StudySession,
  Room,
  RoomMember,
  Message,
  PredefinedMessage
};

// İlişkileri kur
const setupAssociations = () => {
  try {
    // --- User <-> StudySession İlişkisi ---
    User.hasMany(StudySession, {
      foreignKey: 'user_id',
      as: 'studySessions'
    });
    StudySession.belongsTo(User, {
      foreignKey: 'user_id',
      as: 'user'
    });
    
    // 1. User <-> Room (Oda Sahibi) (Bire-Çok)
    User.hasMany(Room, {
      foreignKey: 'owner_id',
      as: 'ownedRooms'
    });
    Room.belongsTo(User, {
      foreignKey: 'owner_id',
      as: 'owner'
    });

    // 2. User <-> Room (Üyeler) (Çoka-Çok)
    User.belongsToMany(Room, {
      through: RoomMember,
      foreignKey: 'user_id',
      otherKey: 'room_id',
      as: 'joinedRooms'
    });
    Room.belongsToMany(User, {
      through: RoomMember,
      foreignKey: 'room_id',
      otherKey: 'user_id',
      as: 'members'
    });

    // 2b. Ara Tabloya Doğrudan İlişkiler
    User.hasMany(RoomMember, { foreignKey: 'user_id' });
    RoomMember.belongsTo(User, { foreignKey: 'user_id' });
    Room.hasMany(RoomMember, { foreignKey: 'room_id' });
    RoomMember.belongsTo(Room, { foreignKey: 'room_id' });

    // 3. User <-> Message (Mesaj Gönderen) (Bire-Çok)
    User.hasMany(Message, {
      foreignKey: 'sender_id',
      as: 'sentMessages'
    });
    Message.belongsTo(User, {
      foreignKey: 'sender_id',
      as: 'sender'
    });

    // 4. Room <-> Message (Oda Mesajları) (Bire-Çok)
    Room.hasMany(Message, {
      foreignKey: 'room_id',
      as: 'messages'
    });
    Message.belongsTo(Room, {
      foreignKey: 'room_id',
      as: 'room'
    });

    // 5. PredefinedMessage <-> Message (Bire-Çok)
    PredefinedMessage.hasMany(Message, {
      foreignKey: 'message_key'
    });
    Message.belongsTo(PredefinedMessage, {
      foreignKey: 'message_key'
    });

   // console.log("✅ Model associations set up successfully.");
  } catch (error) {
    console.error("❌ Error setting up model associations:", error);
  }
};

// İlişkileri kur
setupAssociations();

// Modelleri ve sequelize'ı export et
export { sequelize };
export default models;