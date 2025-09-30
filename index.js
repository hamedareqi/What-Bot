const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const GREEN_ID = process.env.GREEN_ID;
const GREEN_TOKEN = process.env.GREEN_TOKEN;

const userMessages = {}; // حفظ آخر 10 رسائل لكل مستخدم

function loadKnowledge() {
  try {
    const raw = fs.readFileSync('./knowledge.json', 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('❌ فشل تحميل ملف المعرفة:', err.message);
    return {};
  }
}

function matchMessage(message, knowledge) {
  const normalized = message.trim().toLowerCase();
  for (const key in knowledge) {
    if (normalized.includes(key.toLowerCase())) {
      return knowledge[key];
    }
  }
  return null;
}

async function checkMessages() {
  try {
    const response = await axios.get(`https://api.green-api.com/waInstance${GREEN_ID}/ReceiveNotification/${GREEN_TOKEN}`);
    const data = response.data;

    if (data?.body?.typeWebhook === 'incomingMessageReceived') {
      const message = data.body.messageData?.textMessageData?.textMessage;
      const sender = data.body.senderData?.chatId;

      if (message && sender) {
        console.log(`📩 رسالة من ${sender}: ${message}`);

        // حفظ الرسالة في سجل المستخدم
        if (!userMessages[sender]) userMessages[sender] = [];
        userMessages[sender].push(message);
        if (userMessages[sender].length > 10) userMessages[sender].shift();

        const knowledge = loadKnowledge();
        const reply = matchMessage(message, knowledge) || '❌ عذرًا، لا يمكنني الرد على هذا السؤال لأنه خارج نطاق المعرفة المحددة.';

        await axios.post(`https://api.green-api.com/waInstance${GREEN_ID}/SendMessage/${GREEN_TOKEN}`, {
          chatId: sender,
          message: reply
        });

        await axios.delete(`https://api.green-api.com/waInstance${GREEN_ID}/DeleteNotification/${GREEN_TOKEN}/${data.receiptId}`);
      }
    }
  } catch (error) {
    console.error('❌ خطأ أثناء الفحص:', error.message);
  }
}

// فحص دوري كل 2 ثانية
setInterval(checkMessages, 2000);
