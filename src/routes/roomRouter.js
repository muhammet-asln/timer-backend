import express from 'express';
import roomController from '../controller/roomController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

// --- Oda Rotaları ---
// Neredeyse tüm oda işlemleri kimlik doğrulaması gerektirir.

/**
 * @route   POST /api/rooms
 * @desc    Yeni bir özel oda oluştur
 * @access  Private
 */
router.post(
  '/',
  authenticate, // Giriş yapmış kullanıcı
  roomController.createRoom.bind(roomController)
);

/**
 * @route   POST /api/rooms/join
 * @desc    Davet koduyla özel bir odaya katıl
 * @access  Private
 */
router.post(
  '/join',
  authenticate, // Giriş yapmış kullanıcı
  roomController.joinRoom.bind(roomController)
);

/**
 * @route   GET /api/rooms
 * @desc    Herkse açık (public) odaları listele
 * @access  Private (Public odaları görmek için de giriş yapmak mantıklı)
 */
router.get(
  '/',
  authenticate,
  roomController.getPublicRooms.bind(roomController)
);

/**
 * @route   GET /api/rooms/:id
 * @desc    Belirli bir odanın detaylarını getir (üyeler, mesajlar vb.)
 * @access  Private
 */
router.get(
  '/:id',
  authenticate, // Giriş yapmış kullanıcı
  roomController.getRoomDetails.bind(roomController)
);


// --- Hazır Mesaj Rotası ---
// Bu, teknik olarak 'rooms' ile değil 'messages' ile ilgili,
// ancak oda özelliğiyle yakından ilişkili olduğu için buraya veya
// ayrı bir `messageRouter.js`'a koyabiliriz. Şimdilik burada dursun.

/**
 * @route   GET /api/messages/predefined
 * @desc    Sohbette kullanılacak tüm hazır mesajları listele
 * @access  Private
 */
router.get(
  '/messages/predefined', // Bu rota /api/rooms/messages/predefined olacak
  authenticate,
  roomController.getPredefinedMessages.bind(roomController)
);

export default router;
