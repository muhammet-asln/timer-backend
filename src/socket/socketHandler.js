import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import RoomMember from '../models/roomMember.js';
import Room from '../models/room.js';
import User from '../models/user.js';
import Message from '../models/message.js';
import PredefinedMessage from '../models/predefinedMessage.js';

const activeUsers = new Map();

export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // JWT Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: Token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      socket.userId = decoded.id;
      socket.username = decoded.username;
      
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.username} (${socket.userId})`);

    // 1. ODAYA KATILMA
    socket.on('join-room', async (data) => {
      try {
        const { roomId, subject } = data;

        const membership = await RoomMember.findOne({
          where: { user_id: socket.userId, room_id: roomId }
        });

        if (!membership) {
          socket.emit('error', { message: 'Bu odaya erişim izniniz yok.' });
          return;
        }

        socket.join(`room-${roomId}`);
        
        activeUsers.set(socket.id, {
          userId: socket.userId,
          username: socket.username,
          roomId: roomId
        });

        await membership.update({
          current_status: 'idle',
          current_subject: subject || null
        });

        const user = await User.findByPk(socket.userId, {
          attributes: ['id', 'username', 'avatar_id']
        });

        socket.to(`room-${roomId}`).emit('user-joined', {
          user: {
            id: user.id,
            username: user.username,
            avatar_id: user.avatar_id,
            current_status: 'idle',
            current_subject: subject || null
          },
          message: `${user.username} odaya katıldı`
        });

        socket.emit('joined-room', {
          roomId,
          message: 'Odaya başarıyla katıldınız'
        });

        const activeCount = await getActiveUsersInRoom(io, roomId);
        io.to(`room-${roomId}`).emit('active-users-count', { count: activeCount });

        console.log(`👤 ${socket.username} joined room ${roomId}`);
      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('error', { message: 'Odaya katılırken bir hata oluştu.' });
      }
    });

    // 2. DURUM DEĞİŞİKLİĞİ
    socket.on('status-change', async (data) => {
      try {
        const { roomId, status, subject } = data;

        if (!['idle', 'working', 'break'].includes(status)) {
          socket.emit('error', { message: 'Geçersiz durum.' });
          return;
        }

        const membership = await RoomMember.findOne({
          where: { user_id: socket.userId, room_id: roomId }
        });

        if (membership) {
          await membership.update({
            current_status: status,
            current_subject: subject || membership.current_subject
          });

          io.to(`room-${roomId}`).emit('user-status-changed', {
            userId: socket.userId,
            username: socket.username,
            status,
            subject: subject || membership.current_subject
          });

          console.log(`🔄 ${socket.username} changed status to ${status} in room ${roomId}`);
        }
      } catch (error) {
        console.error('Error changing status:', error);
        socket.emit('error', { message: 'Durum değiştirilemedi.' });
      }
    });

    // 3. MESAJ GÖNDERME
    socket.on('send-message', async (data) => {
      try {
        const { roomId, messageKey } = data;

        const predefinedMessage = await PredefinedMessage.findByPk(messageKey);
        
        if (!predefinedMessage) {
          socket.emit('error', { message: 'Geçersiz mesaj.' });
          return;
        }

        const newMessage = await Message.create({
          room_id: roomId,
          sender_id: socket.userId,
          message_key: messageKey
        });

        const sender = await User.findByPk(socket.userId, {
          attributes: ['id', 'username', 'avatar_id']
        });

        io.to(`room-${roomId}`).emit('new-message', {
          id: newMessage.id,
          room_id: roomId,
          sender: {
            id: sender.id,
            username: sender.username,
            avatar_id: sender.avatar_id
          },
          content: predefinedMessage.content,
          message_key: messageKey,
          created_at: newMessage.created_at
        });

        console.log(`💬 ${socket.username} sent message in room ${roomId}`);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Mesaj gönderilemedi.' });
      }
    });

    // 4. ODADAN AYRILMA
    socket.on('leave-room', async (data) => {
      try {
        const { roomId } = data;
        
        await handleUserLeave(socket, roomId, io);
        
        socket.emit('left-room', { 
          roomId,
          message: 'Odadan ayrıldınız' 
        });
      } catch (error) {
        console.error('Error leaving room:', error);
        socket.emit('error', { message: 'Odadan çıkılamadı.' });
      }
    });

    // 5. DISCONNECT
    socket.on('disconnect', async () => {
      try {
        const userData = activeUsers.get(socket.id);
        
        if (userData && userData.roomId) {
          await handleUserLeave(socket, userData.roomId, io);
        }
        
        activeUsers.delete(socket.id);
        console.log(`❌ User disconnected: ${socket.username} (${socket.userId})`);
      } catch (error) {
        console.error('Error on disconnect:', error);
      }
    });
  });

  console.log('✅ Socket.io initialized');
  return io;
};

async function handleUserLeave(socket, roomId, io) {
  try {
    socket.leave(`room-${roomId}`);
    
    const membership = await RoomMember.findOne({
      where: { user_id: socket.userId, room_id: roomId }
    });

    if (membership) {
      await membership.update({
        current_status: 'idle',
        current_subject: null
      });
    }

    socket.to(`room-${roomId}`).emit('user-left', {
      userId: socket.userId,
      username: socket.username,
      message: `${socket.username} odadan ayrıldı`
    });

    const activeCount = await getActiveUsersInRoom(io, roomId);
    io.to(`room-${roomId}`).emit('active-users-count', { count: activeCount });

    console.log(`👋 ${socket.username} left room ${roomId}`);
  } catch (error) {
    console.error('Error in handleUserLeave:', error);
    throw error;
  }
}

async function getActiveUsersInRoom(io, roomId) {
  try {
    const room = io.sockets.adapter.rooms.get(`room-${roomId}`);
    return room ? room.size : 0;
  } catch (error) {
    console.error('Error getting active users:', error);
    return 0;
  }
}

export { activeUsers };
