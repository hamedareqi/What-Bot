const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

// إعداد المتغيرات من البيئة
const GREEN_ID = process.env.GREEN_ID;
const GREEN_TOKEN = process.env.GREEN_TOKEN;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// استقبال الرسائل من Green-API
app.post('/webhook', async (req, res) => {
  console.log('📥 تم استقبال طلب Webhook من Green-API');

  const body = req.body;

  // تجاهل أي إشعار غير متعلق برسالة واردة
  if (body.typeWebhook !== 'incomingMessageReceived') {
    console.log(`⚠️ تم تجاهل إشعار من نوع: ${body.typeWebhook}`);
    return res.sendStatus(200);
  }

  const messageData = body.messageData?.textMessageData;
  const senderData = body.senderData;

  if (!messageData || !senderData || !senderData.chatId) {
    console.log('⚠️ لا توجد رسالة نصية صالحة أو بيانات مرسل.');
    return res.sendStatus(200);
  }

  const sender = senderData.chatId;
  const message = messageData.textMessage;

  console.log(`📩 رسالة من ${sender}: ${message}`);

  let reply = '❌ لم يتم توليد رد.';
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'qwen/qwen3-4b:free',
        messages: [{ role: 'user', content: message }],
        max_tokens: 1000
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    reply = response.data?.choices?.[0]?.message?.content || reply;
    console.log(`🤖 رد الذكاء الاصطناعي: ${reply}`);
  } catch (error) {
    console.error('❌ خطأ في الاتصال بـ OpenRouter:', error.message);
  }

  try {
    await axios.post(`https://api.green-api.com/waInstance${GREEN_ID}/SendMessage/${GREEN_TOKEN}`, {
      chatId: sender,
      message: reply
    });
    console.log(`✅ تم إرسال الرد إلى ${sender}`);
  } catch (error) {
    console.error('❌ فشل إرسال الرد إلى واتساب:', error.message);
  }

  res.sendStatus(200);
});

// تشغيل السيرفر وطباعة رابط Webhook تلقائيًا
app.listen(3000, () => {
  const username = 'hamedareqi';       // اسم المستخدم في Replit
  const project = 'what-bot';          // اسم المشروع في Replit
  const webhookUrl = `https://${project}-${username}.replit.app/webhook`;

  console.log('🚀 Webhook server يعمل على المنفذ 3000');
  console.log(`🌐 رابط Webhook الكامل: ${webhookUrl}`);
});
