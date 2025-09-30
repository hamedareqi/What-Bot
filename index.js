const express = require('express');
const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(express.json());

const GREEN_ID = process.env.GREEN_ID;
const GREEN_TOKEN = process.env.GREEN_TOKEN;

// حفظ آخر 10 رسائل لكل مستخدم
const userMessages = {}; // { chatId: [msg1, msg2, ..., msg10] }

// تحميل الأوامر من ملف خارجي
function loadCommands() {
  try {
    const raw = fs.readFileSync('./commands.json', 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('❌ فشل تحميل ملف الأوامر:', err.message);
    return {};
  }
}

app.post('/webhook', async (req, res) => {
  const body = req.body;

  if (body.typeWebhook !== 'incomingMessageReceived') return res.sendStatus(200);

  const message = body.messageData?.textMessageData?.textMessage;
  const sender = body.senderData?.chatId;

  if (!message || !sender) return res.sendStatus(200);

  console.log(`📩 رسالة من ${sender}: ${message}`);

  // حفظ الرسالة في سجل المستخدم
  if (!userMessages[sender]) userMessages[sender] = [];
  userMessages[sender].push(message);
  if (userMessages[sender].length > 10) userMessages[sender].shift(); // احتفظ بآخر 10 فقط

  // تحميل الأوامر المسموحة من الملف
  const allowedCommands = loadCommands();

  let reply;
  if (allowedCommands[message]) {
    reply = allowedCommands[message];
  } else {
    reply = '❌ هذا السؤال غير مدعوم حاليًا. يرجى اختيار سؤال من القائمة المسموحة.';
  }

  try {
    await axios.post(`https://api.green-api.com/waInstance${GREEN_ID}/SendMessage/${GREEN_TOKEN}`, {
      chatId: sender,
      message: reply
    });
    console.log(`✅ تم إرسال الرد إلى ${sender}`);
  } catch (error) {
    console.error('❌ فشل إرسال الرد:', error.message);
  }

  res.sendStatus(200);
});

// تشغيل السيرفر وطباعة رابط Webhook
app.listen(3000, () => {
  const username = 'hamedareqi';       // اسم المستخدم في Replit
  const project = 'what-bot';          // اسم المشروع في Replit
  const webhookUrl = `https://${project}-${username}.replit.app/webhook`;

  console.log('🚀 السيرفر يعمل على المنفذ 3000');
  console.log(`🌐 رابط Webhook الكامل: ${webhookUrl}`);
});
