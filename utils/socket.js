const Redis = require('ioredis');
const redis = new Redis();      // Publisher
const redisSubscriber = new Redis(); // Subscriber
const Message = require('../models/messages');
const CryptoJS = require('crypto-js'); // <-- Add this line to import CryptoJS

// In-memory user-to-socket map
const userSocketMap = new Map();

module.exports = (io) => {
  redisSubscriber.subscribe('chatChannel', (err, count) => {
    if (err) console.error('Redis subscribe error:', err);
    else console.log(`Subscribed to chatChannel (${count} subscriptions)`);
  });

  redisSubscriber.on('message', (channel, message) => {
    if (channel === 'chatChannel') {
      const { to, from, text } = JSON.parse(message);
      const socketId = userSocketMap.get(to);
      
      // Prevent sending duplicate to sender
      if (socketId && socketId !== userSocketMap.get(from)) {
        io.to(socketId).emit('chatMessage', { from, text });
      }
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Register userId with this socket
    socket.on('register', ({ userId }) => {
      if (userId) {
        userSocketMap.set(userId, socket.id);
        console.log(`Mapped user ${userId} to socket ${socket.id}`);
      }
    });

    socket.on('chatMessage', async (data) => {
      const fromUserId = [...userSocketMap.entries()]
        .find(([_, id]) => id === socket.id)?.[0];
    
      if (!fromUserId) return;
    
      const payload = {
        from: fromUserId,
        to: data.to,    // Ensure that `data.to` is available
        text: data.text, // Ensure that `data.text` is available
      };

      // Encrypt the message before storing it
      const derivedKey = `${[fromUserId, data.to].sort().join("_")}_secretkey`; // Derived key based on user ids
      const encryptedText = CryptoJS.AES.encrypt(data.text, derivedKey).toString(); // Encrypt the message

      // Store message in DB with encrypted text
      try {
        await Message.create({ ...payload, text: encryptedText });
      } catch (e) {
        console.error('Failed to store message:', e);
      }
    
      // Echo to sender
      socket.emit('chatMessage', { ...payload, text: encryptedText });
    
      // Publish for Redis broadcast
      redis.publish('chatChannel', JSON.stringify(payload));
    });

    socket.on('disconnect', () => {
      for (const [userId, sockId] of userSocketMap.entries()) {
        if (sockId === socket.id) {
          userSocketMap.delete(userId);
          break;
        }
      }
      console.log('User disconnected:', socket.id);
    });
  });
};
