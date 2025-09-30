
import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// --- إعداد البوت ---
const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'bot' }),
});

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const QR_SENT_FLAG = './qr_sent.flag'; // لضمان إرسال QR مرة واحدة فقط

// --- توليد QR وإرساله لتليجرام ---
client.on('qr', async qr => {
  try {
    if (fs.existsSync(QR_SENT_FLAG)) return; // تم الإرسال مسبقًا

    const qrImagePath = './qr.png';
    await qrcode.toFile(qrImagePath, qr);

    const formData = new FormData();
    formData.append('chat_id', TELEGRAM_CHAT_ID);
    formData.append('photo', fs.createReadStream(qrImagePath));

    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
      formData,
      { headers: formData.getHeaders() }
    );

    fs.writeFileSync(QR_SENT_FLAG, 'sent');
    console.log('QR code sent to Telegram successfully!');
  } catch (error) {
    console.error('Error sending QR to Telegram:', error);
  }
});

// --- حفظ الجلسة تلقائيًا ---
client.on('ready', () => {
  console.log('WhatsApp Bot is ready!');
});

// --- استقبال الرسائل والرد عليها ---
client.on('message', async msg => {
  try {
    console.log(`Received message from ${msg.from}: ${msg.body}`);

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

    const reply = response.data.choices[0].message.content;
    await msg.reply(reply);

    console.log(`Replied to ${msg.from}`);
  } catch (error) {
    console.error('Error handling message:', error);
    await msg.reply('حدث خطأ أثناء معالجة رسالتك.');
  }
});

// --- تشغيل البوت ---
client.initialize();
