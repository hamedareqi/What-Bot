const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
require('dotenv').config();

// إعداد البوت
const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'bot' }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process'
    ]
  }
});

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const QR_SENT_FLAG = './qr_sent.flag';

// إرسال رمز QR إلى تيليجرام مرة واحدة فقط
client.on('qr', async qr => {
  try {
    if (fs.existsSync(QR_SENT_FLAG)) return;

    const qrImagePath = './qr.png';
    await qrcode.toFile(qrImagePath, qr);

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
    console.log('✅ تم إرسال صورة QR إلى تيليجرام بنجاح');
  } catch (error) {
    console.error('❌ خطأ أثناء إرسال QR إلى تيليجرام:', error.message);
  }
});

// تأكيد جاهزية البوت
client.on('ready', () => {
  console.log('🤖 البوت جاهز ويعمل على حسابك مباشرة.');
});

// استقبال الرسائل والرد باستخدام OpenRouter
client.on('message', async msg => {
  try {
    console.log(`📩 رسالة واردة من ${msg.from}: ${msg.body}`);

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'mistral/mistral-7b-instruct',
        messages: [{ role: 'user', content: msg.body }],
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
    await msg.reply(reply);
    console.log(`✅ تم الرد على ${msg.from}`);
  } catch (error) {
    console.error('❌ خطأ أثناء معالجة الرسالة:', error.message);
    await msg.reply('حدث خطأ أثناء معالجة رسالتك.');
  }
});

// تشغيل البوت
client.initialize();
