const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const GREEN_ID = process.env.GREEN_ID;
const GREEN_TOKEN = process.env.GREEN_TOKEN;

let delay = 60000; // يبدأ بـ 60 ثانية
const minDelay = 5000;
const maxDelay = 150000;
const delayStep = 15000;
let idleCount = 0;

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
  console.log(`⏳ انتظار ${delay / 1000} ثانية...`);
  setTimeout(async () => {
    console.log(`🔄 تحقق بعد الخمول (${delay / 1000} ثانية)`);

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

          // عند وجود رسالة، نعود إلى الفحص السريع
          delay = minDelay;
          idleCount = 0;
        }
      } else {
        // لا توجد رسالة، نزيد التأخير تدريجيًا
        delay = Math.min(maxDelay, delay + delayStep);
        idleCount++;
        console.log(`😴 لا توجد رسائل، عداد الخمول: ${idleCount}`);
      }
    } catch (error) {
      console.error('❌ خطأ أثناء الفحص:', error.message);
      delay = Math.min(maxDelay, delay + delayStep);
      idleCount++;
    }

    // إعادة الفحص بعد التأخير الجديد
    checkMessages();
  }, delay);
}

// بدء الفحص
checkMessages();
