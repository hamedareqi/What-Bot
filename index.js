const axios = require('axios');
require('dotenv').config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const GREEN_ID = process.env.GREEN_ID;
const GREEN_TOKEN = process.env.GREEN_TOKEN;

async function checkMessages() {
  try {
    const res = await axios.get(`https://api.green-api.com/waInstance${GREEN_ID}/ReceiveNotification/${GREEN_TOKEN}`);
    const data = res.data;

    if (!data || !data.body || !data.body.messageData || !data.body.messageData.textMessageData) return;

    const sender = data.body.senderData.chatId;
    const message = data.body.messageData.textMessageData.textMessage;

    console.log(`📩 رسالة من ${sender}: ${message}`);

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'mistral/mistral-7b-instruct',
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

    const reply = response.data?.choices?.[0]?.message?.content || 'لم أتمكن من توليد رد.';

    await axios.post(`https://api.green-api.com/waInstance${GREEN_ID}/SendMessage/${GREEN_TOKEN}`, {
      chatId: sender,
      message: reply
    });

    console.log(`✅ تم الرد على ${sender}`);

    await axios.delete(`https://api.green-api.com/waInstance${GREEN_ID}/DeleteNotification/${GREEN_TOKEN}/${data.receiptId}`);
  } catch (error) {
    console.error('❌ خطأ أثناء المعالجة:', error.message);
  }
}

setInterval(checkMessages, 5000);
