import { sequelize } from '../config/db.js';
import { Op } from 'sequelize';
import { startOfDay } from 'date-fns';
import crypto from 'crypto'; // invite_code üretmek için

// Gerekli tüm modellerimizi import ediyoruz
import Room from '../models/room.js';
import RoomMember from '../models/roomMember.js';
import User from '../models/user.js';
import Message from '../models/message.js';
import PredefinedMessage from '../models/predefinedMessage.js';
import StudySession from '../models/studySession.js';

class RoomService {

  /**
   * Benzersiz bir davet kodu üretir.
   */
  async generateInviteCode() {
    let inviteCode;
    let isUnique = false;
    do {
      // 6 karakterlik rastgele bir kod üret (örn: 'a8f3b1')
      inviteCode = crypto.randomBytes(3).toString('hex');
      // Kodun veritabanında olup olmadığını kontrol et
      const existingRoom = await Room.findOne({ where: { invite_code: inviteCode } });
      if (!existingRoom) {
        isUnique = true;
      }
    } while (!isUnique);
    return inviteCode;
  }

  /**
   * Yeni bir özel (private) oda oluşturur.
   * @param {object} roomData - Oda bilgileri (name, max_members)
   * @param {number} ownerId - Odanın sahibi olan kullanıcının ID'si
   */
  async createRoom(roomData, ownerId) {
    // Oda oluşturma ve üyeyi ekleme atomik bir işlem olmalı (transaction)
    const transaction = await sequelize.transaction();
    try {
      // 1. Benzersiz davet kodunu üret
      const inviteCode = await this.generateInviteCode();

      // 2. Odayı oluştur
      const newRoom = await Room.create({
        name: roomData.name,
        owner_id: ownerId,
        room_type: 'private',
        invite_code: inviteCode,
        max_members: roomData.max_members || null // Belirtilmezse limitsiz
      }, { transaction });

      // 3. Oda sahibini odaya ilk üye olarak ekle
      await RoomMember.create({
        room_id: newRoom.id,
        user_id: ownerId,
        current_status: 'idle' // Başlangıçta 'boşta'
      }, { transaction });

      // 4. İşlemi onayla
      await transaction.commit();
      
      return { success: true, data: newRoom };
    } catch (error) {
      // Hata olursa tüm işlemleri geri al
      await transaction.rollback();
      throw new Error(`Oda oluşturulamadı: ${error.message}`);
    }
  }

  /**
   * Bir kullanıcıyı davet kodu ile özel bir odaya ekler.
   * @param {string} inviteCode - Odanın davet kodu
   * @param {number} userId - Katılmak isteyen kullanıcının ID'si
   */
  async joinRoom(inviteCode, userId) {
    const transaction = await sequelize.transaction();
    try {
      // 1. Kodu kullanarak odayı bul
      const room = await Room.findOne({
        where: { invite_code: inviteCode, room_type: 'private' }
      }, { transaction });

      if (!room) {
        throw new Error('Geçersiz davet kodu veya oda özel değil.');
      }

      // 2. Kullanıcı zaten üye mi diye kontrol et
      const existingMember = await RoomMember.findOne({
        where: { room_id: room.id, user_id: userId }
      }, { transaction });

      if (existingMember) {
        throw new Error('Zaten bu odadasınız.');
      }

      // 3. Oda dolu mu diye kontrol et (eğer limit varsa)
      if (room.max_members) {
        const memberCount = await RoomMember.count({
          where: { room_id: room.id }
        }, { transaction });
        
        if (memberCount >= room.max_members) {
          throw new Error('Oda kapasitesi dolu.');
        }
      }

      // 4. Kullanıcıyı odaya üye olarak ekle
      await RoomMember.create({
        room_id: room.id,
        user_id: userId,
        current_status: 'idle'
      }, { transaction });

      await transaction.commit();
      return { success: true, message: 'Odaya başarıyla katıldınız.', data: room };
    } catch (error) {
      await transaction.rollback();
      throw new Error(`Odaya katılım başarısız: ${error.message}`);
    }
  }

  /**
   * Herkesin görebileceği public odaları listeler.
   */
  async getPublicRooms() {
    try {
      // TODO: Public odalara üye sayısını da eklemek iyi olabilir (performanslı bir yolla)
      const rooms = await Room.findAll({
        where: { room_type: 'public' }
      });
      return { success: true, data: rooms };
    } catch (error) {
      throw new Error(`Public odalar alınamadı: ${error.message}`);
    }
  }

  /**
   * Bir odanın detaylı bilgisini (üyeler ve son mesajlar) getirir.
   * @param {number} roomId - Odanın ID'si
   * @param {number} userId - İstek yapan kullanıcının ID'si (yetki kontrolü için)
   */
  async getRoomDetails(roomId, userId) {
    try {
      // 1. Odayı bul
      const room = await Room.findByPk(roomId);
      if (!room) {
        throw new Error('Oda bulunamadı.');
      }

      // 2. Yetki Kontrolü: Oda özelse, kullanıcı üye mi?
      if (room.room_type === 'private') {
        const isMember = await RoomMember.findOne({
          where: { room_id: roomId, user_id: userId }
        });
        if (!isMember) {
          throw new Error('Bu özel odaya erişim izniniz yok.');
        }
      }

      // 3. Odanın tüm detaylarını çek (Üyeler ve Mesajlar dahil)
      const roomDetails = await Room.findByPk(roomId, {
        include: [
          {
            model: User,
            as: 'members', // associations.js'teki 'as' ile aynı olmalı
            attributes: ['id', 'username', 'avatar_id'], // Şifre gibi bilgileri alma
            through: {
              // Ara tablodan (room_members) bu verileri de çek
              model: RoomMember,
              attributes: ['current_status', 'current_subject']
            }
          },
          {
            model: Message,
            as: 'messages',
            order: [['created_at', 'DESC']], // Önce en yeni mesajlar
            limit: 50, // Son 50 mesajı al
            include: [
              { model: User, as: 'sender', attributes: ['id', 'username', 'avatar_id'] },
              { model: PredefinedMessage } // Mesajın içeriğini almak için
            ]
          }
        ]
      });

      // 4. Üyelerin "O Günkü Toplam Çalışma Süresini" hesapla (Kritik Karar)
      const memberIds = roomDetails.members.map(m => m.id);
      const today = startOfDay(new Date());

      const studyStats = await StudySession.findAll({
        where: {
          user_id: { [Op.in]: memberIds },
          created_at: { [Op.gte]: today } // Bugünden itibaren
        },
        attributes: [
          'user_id',
          [sequelize.fn('SUM', sequelize.col('duration_seconds')), 'totalStudyToday']
        ],
        group: ['user_id'],
        raw: true
      });

      // İstatistikleri bir haritaya dök (Map)
      const statsMap = new Map(studyStats.map(s => [s.user_id, parseInt(s.totalStudyToday, 10)]));

      // Son veriyi birleştir
      // .toJSON() kullanarak Sequelize nesnesini normal JSON'a çeviriyoruz
      const finalRoomData = roomDetails.toJSON();
      
      // Üyelerin listesine 'totalStudyToday' verisini ekle
      finalRoomData.members = finalRoomData.members.map(member => {
        // `member.RoomMember` 'through' ile gelen ara tablo verisidir.
        const memberStatus = member.RoomMember; 
        delete member.RoomMember; // Bu gereksiz veriyi temizle
        
        return {
          ...member,
          current_status: memberStatus.current_status,
          current_subject: memberStatus.current_subject,
          totalStudyToday: statsMap.get(member.id) || 0 // StatMap'ten veriyi al
        };
      });

      // Mesajları yeniden sırala (en eskiden en yeniye)
      finalRoomData.messages = finalRoomData.messages.reverse();

      return { success: true, data: finalRoomData };
    } catch (error) {
      throw new Error(`Oda detayları alınamadı: ${error.message}`);
    }
  }

  /**
   * Tüm hazır (predefined) mesajları listeler.
   */
  async getPredefinedMessages() {
    try {
      const messages = await PredefinedMessage.findAll();
      return { success: true, data: messages };
    } catch (error) {
      throw new Error(`Hazır mesajlar alınamadı: ${error.message}`);
    }
  }
}

export default new RoomService();

