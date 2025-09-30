const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
require('dotenv').config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const QR_SENT_FLAG = './qr_sent.flag';

(async () => {
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    syncFullHistory: false
  });

  // توليد رمز QR وإرساله إلى تيليجرام مرة واحدة فقط
  sock.ev.on('connection.update', async update => {
    const { qr, connection } = update;

    if (qr && !fs.existsSync(QR_SENT_FLAG)) {
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
      console.log('✅ تم إرسال رمز QR إلى تيليجرام');
    }

    if (connection === 'open') {
      console.log('🤖 البوت جاهز ويعمل على حسابك مباشرة.');
    }
  });

  // استقبال الرسائل والرد باستخدام OpenRouter
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const sender = msg.key.remoteJid;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text;

    if (!text) return;

    console.log(`📩 رسالة واردة من ${sender}: ${text}`);

    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'mistral/mistral-7b-instruct',
          messages: [{ role: 'user', content: text }],
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
      await sock.sendMessage(sender, { text: reply });
      console.log(`✅ تم الرد على ${sender}`);
    } catch (error) {
      console.error('❌ خطأ أثناء معالجة الرسالة:', error.message);
      await sock.sendMessage(sender, { text: 'حدث خطأ أثناء معالجة رسالتك.' });
    }
  });

  // حفظ الجلسة تلقائيًا
  sock.ev.on('creds.update', saveCreds);
})();
