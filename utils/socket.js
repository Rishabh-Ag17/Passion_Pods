const Redis = require('ioredis');
const redis = new Redis();      // Publisher
const redisSubscriber = new Redis(); // Subscriber
const Message = require('../models/messages');


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
        to: data.to,
        text: data.text,
      };
    
      // Store message in DB
      try {
        await Message.create(payload);
      } catch (e) {
        console.error('Failed to store message:', e);
      }
    
      // Echo to sender
      socket.emit('chatMessage', payload);
    
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
