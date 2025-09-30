const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

// بيانات الاتصال بـ Green-API
const GREEN_ID = process.env.GREEN_ID;
const GREEN_TOKEN = process.env.GREEN_TOKEN;

// استخدم رابط الإنستانس المخصص حسب الصورة الأخيرة
const BASE_URL = `https://7105.api.greenapi.com/waInstance${GREEN_ID}`;

// حفظ آخر 10 رسائل لكل مستخدم
const userMessages = {};

// تحميل قاعدة المعرفة من ملف خارجي
function loadKnowledge() {
  try {
    const raw = fs.readFileSync('./knowledge.json', 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('❌ فشل تحميل ملف المعرفة:', err.message);
    return {};
  }
}

// مطابقة الرسالة مع قاعدة المعرفة
function matchMessage(message, knowledge) {
  const normalized = message.trim().toLowerCase();
  for (const key in knowledge) {
    if (normalized.includes(key.toLowerCase())) {
      return knowledge[key];
    }
  }
  return null;
}

// الفحص الدوري للرسائل
async function checkMessages() {
  try {
    const response = await axios.get(`${BASE_URL}/ReceiveNotification/${GREEN_TOKEN}`);
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

        // تحميل المعرفة والرد
        const knowledge = loadKnowledge();
        const reply = matchMessage(message, knowledge) || '❌ عذرًا، لا يمكنني الرد على هذا السؤال لأنه خارج نطاق المعرفة المحددة.';

        await axios.post(`${BASE_URL}/SendMessage/${GREEN_TOKEN}`, {
          chatId: sender,
          message: reply
        });

        // حذف الإشعار بعد الرد
        await axios.delete(`${BASE_URL}/DeleteNotification/${GREEN_TOKEN}/${data.receiptId}`);
      }
    }
  } catch (error) {
    console.error('❌ خطأ أثناء الفحص:', error.response?.status || error.message);
  }
}

// تشغيل الفحص كل 2 ثانية
setInterval(checkMessages, 2000);
