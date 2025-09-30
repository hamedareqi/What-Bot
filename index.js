const axios = require('axios');
require('dotenv').config();

const GREEN_ID = process.env.GREEN_ID;
const GREEN_TOKEN = process.env.GREEN_TOKEN;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

console.log('🚀 بدء تشغيل البوت...');

async function checkMessages() {
  console.log('🔄 فحص الرسائل الجديدة...');

  try {
    const res = await axios.get(`https://api.green-api.com/waInstance${GREEN_ID}/ReceiveNotification/${GREEN_TOKEN}`);
    const data = res.data;

    if (!data) {
      console.log('📭 لا توجد إشعارات جديدة.');
      return;
    }

    const receiptId = data.receiptId;
    const messageData = data.body?.messageData?.textMessageData;
    const senderData = data.body?.senderData;

    if (!messageData || !senderData) {
      console.log('⚠️ تم استقبال إشعار غير صالح أو لا يحتوي على رسالة نصية.');
      await axios.delete(`https://api.green-api.com/waInstance${GREEN_ID}/DeleteNotification/${GREEN_TOKEN}/${receiptId}`);
      return;
    }

    const sender = senderData.chatId;
    const message = messageData.textMessage;

    console.log(`📩 رسالة واردة من ${sender}: ${message}`);

    // إرسال إلى OpenRouter
    let reply = '❌ لم يتم توليد رد.';
    try {
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

      reply = response.data?.choices?.[0]?.message?.content || reply;
      console.log(`🤖 رد الذكاء الاصطناعي: ${reply}`);
    } catch (error) {
      console.error('❌ خطأ أثناء الاتصال بـ OpenRouter:', error.message);
    }

    // إرسال الرد إلى واتساب
    try {
      await axios.post(`https://api.green-api.com/waInstance${GREEN_ID}/SendMessage/${GREEN_TOKEN}`, {
        chatId: sender,
        message: reply
      });
      console.log(`✅ تم إرسال الرد إلى ${sender}`);
    } catch (error) {
      console.error('❌ فشل إرسال الرد إلى واتساب:', error.message);
    }

    // حذف الإشعار
    try {
      await axios.delete(`https://api.green-api.com/waInstance${GREEN_ID}/DeleteNotification/${GREEN_TOKEN}/${receiptId}`);
      console.log(`🗑️ تم حذف الإشعار (${receiptId})`);
    } catch (error) {
      console.error('❌ فشل حذف الإشعار:', error.message);
    }

  } catch (error) {
    console.error('❌ خطأ أثناء فحص الرسائل:', error.message);
  }
}

// تشغيل البوت كل 5 ثوانٍ
setInterval(checkMessages, 5000);
