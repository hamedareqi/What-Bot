const wppconnect = require('wppconnect');
const qrcode = require('qrcode');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
require('dotenv').config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const QR_SENT_FLAG = './qr_sent.flag';

wppconnect
  .create({
    session: 'bot-session',
    catchQR: async (base64Qr) => {
      if (fs.existsSync(QR_SENT_FLAG)) return;

      const qrImagePath = './qr.png';
      await qrcode.toFile(qrImagePath, base64Qr);

      const form = new FormData();
      form.append('chat_id', TELEGRAM_CHAT_ID);
      form.append('photo', fs.createReadStream(qrImagePath));
      form.append('caption', '🔑 رمز QR لتسجيل الدخول إلى واتساب');

      await axios.post(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
        form,
        { headers: form.getHeaders() }
      );

      fs.writeFileSync(QR_SENT_FLAG, 'sent');
      console.log('✅ تم إرسال رمز QR إلى تيليجرام');
    },
    headless: true,
    logQR: false,
    autoClose: false,
    popup: false
  })
  .then((client) => {
    console.log('🤖 البوت جاهز ويعمل على حسابك مباشرة.');

    client.onMessage(async (message) => {
      if (!message.body || message.isGroupMsg) return;

      console.log(`📩 رسالة واردة من ${message.from}: ${message.body}`);

      try {
        const response = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model: 'mistral/mistral-7b-instruct',
            messages: [{ role: 'user', content: message.body }],
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
        await client.sendText(message.from, reply);
        console.log(`✅ تم الرد على ${message.from}`);
      } catch (error) {
        console.error('❌ خطأ أثناء معالجة الرسالة:', error.message);
        await client.sendText(message.from, 'حدث خطأ أثناء معالجة رسالتك.');
      }
    });
  })
  .catch((error) => {
    console.error('❌ خطأ أثناء تشغيل البوت:', error.message);
  });
