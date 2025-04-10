const CryptoJS = require("crypto-js");
const Message = require('../models/messages'); // Import the message model

module.exports.fetchMessages = (req, res) => {
  const { currentUserId, chatPartnerId } = req.params;
  console.log('Fetching messages for:', currentUserId, chatPartnerId);

  // Define the derived key (sender_id_receiver_id_secretkey)
  const derivedKey = `${[currentUserId, chatPartnerId].sort().join("_")}_secretkey`;

  // Find messages between the current user and the chat partner
  Message.find({
    $or: [
      { from: currentUserId, to: chatPartnerId },
      { from: chatPartnerId, to: currentUserId }
    ]
  })
    .sort({ createdAt: 1 })  // Sort by creation date (oldest first)
    .then(messages => {
      // Decrypt the messages here
      const decryptedMessages = messages.map(msg => {
        // Decrypt the message text
        const decryptedText = CryptoJS.AES.decrypt(msg.text, derivedKey).toString(CryptoJS.enc.Utf8);
        return { ...msg.toObject(), text: decryptedText };
      });

      // Send the decrypted messages to the chat view
      res.render('chat/chat', {
        currentUserId,
        chatPartnerId,
        messages: decryptedMessages,  // Pass the decrypted messages to the template
      });
    })
    .catch(err => {
      console.error('Failed to load messages:', err);
      res.status(500).send('Error loading messages');
    });
};
