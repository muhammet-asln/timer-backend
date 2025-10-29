import roomService from '../services/roomService.js';
import Joi from 'joi';

class RoomController {

  // --- Joi Doğrulama Şemaları ---

  // Yeni oda oluşturmak için
  createRoomSchema = Joi.object({
    name: Joi.string().min(3).max(100).required().messages({
      'string.min': 'Oda adı en az 3 karakter olmalı.',
      'string.max': 'Oda adı 100 karakteri geçemez.',
      'any.required': 'Oda adı zorunludur.'
    }),
    max_members: Joi.number().integer().min(2).optional().allow(null).messages({
      'number.min': 'Minimum üye sayısı 2 olmalıdır.'
    })
  });

  // Odaya katılmak için
  joinRoomSchema = Joi.object({
    invite_code: Joi.string().required().messages({
      'any.required': 'Davet kodu zorunludur.'
    })
  });

  // --- Controller Metotları ---

  /**
   * Yeni bir özel oda oluşturur
   * POST /api/rooms
   */
  async createRoom(req, res) {
    try {
      // 1. Gelen veriyi doğrula
      const { error, value } = this.createRoomSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Doğrulama hatası',
          errors: error.details.map(d => d.message)
        });
      }

      // 2. Servisi çağır (req.user.id authMiddleware'den geliyor)
      const result = await roomService.createRoom(value, req.user.id);
      
      // 3. Başarılı cevabı dön
      return res.status(201).json(result);
    } catch (error) {
      console.error('Oda oluşturma hatası:', error.message);
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Bir kullanıcıyı davet koduyla odaya ekler
   * POST /api/rooms/join
   */
  async joinRoom(req, res) {
    try {
      // 1. Gelen veriyi doğrula
      const { error, value } = this.joinRoomSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Doğrulama hatası',
          errors: error.details.map(d => d.message)
        });
      }

      // 2. Servisi çağır
      const result = await roomService.joinRoom(value.invite_code, req.user.id);

      return res.status(200).json(result);
    } catch (error) {
      console.error('Odaya katılma hatası:', error.message);
      // Servisin fırlattığı hataları (Oda dolu, Zaten üyesin vb.) yakala
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Herkese açık odaları listeler
   * GET /api/rooms
   */
  async getPublicRooms(req, res) {
    try {
      const result = await roomService.getPublicRooms();
      return res.status(200).json(result);
    } catch (error) {
      console.error('Public odaları alma hatası:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Bir odanın detaylarını getirir (üyeler, mesajlar vb.)
   * GET /api/rooms/:id
   */
  async getRoomDetails(req, res) {
    try {
      const roomId = req.params.id;
      const userId = req.user.id; // İstek yapan kullanıcı

      const result = await roomService.getRoomDetails(roomId, userId);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Oda detayları alma hatası:', error.message);
      // Yetkisiz erişim veya bulunamadı hataları
      if (error.message.includes('erişim izniniz yok')) {
        return res.status(403).json({ success: false, message: error.message });
      }
      if (error.message.includes('Oda bulunamadı')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Tüm hazır (predefined) mesajları listeler
   * GET /api/messages/predefined
   */
  async getPredefinedMessages(req, res) {
    try {
      const result = await roomService.getPredefinedMessages();
      return res.status(200).json(result);
    } catch (error) {
      console.error('Hazır mesajları alma hatası:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}

export default new RoomController();
