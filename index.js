const { Client, LocalAuth } = require('whatsapp-web.js');
const axios = require('axios');
const QRCode = require('qrcode');
require('dotenv').config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const client = new Client({
    authStrategy: new LocalAuth({ clientId: "whatsapp-bot" }),
    puppeteer: {
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
    }
});

let qrSent = false;

client.on('qr', async qr => {
    if (qrSent) return;
    qrSent = true;

    try {
        const qrImageDataUrl = await QRCode.toDataURL(qr);
        const base64Data = qrImageDataUrl.replace(/^data:image\/png;base64,/, "");

        await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
            chat_id: TELEGRAM_CHAT_ID,
            photo: `data:image/png;base64,${base64Data}`,
            caption: "🔑 رمز QR لتسجيل الدخول إلى واتساب"
        });

        console.log("📤 تم إرسال صورة QR إلى تيليجرام.");
    } catch (err) {
        console.error("❌ فشل إرسال صورة QR إلى تيليجرام:", err.message);
    }
});

client.on('ready', () => {
    console.log('🤖 البوت جاهز ويعمل على حسابك مباشرة.');
});

client.on('message', async message => {
    console.log('📩 رسالة واردة:', message.body);

    try {
        const response = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                model: "mistral/mistral-7b-instruct",
                messages: [
                    { role: "system", content: "أنت مساعد ودود للرد على رسائل العملاء على واتساب." },
                    { role: "user", content: message.body }
                ]
            },
            {
                headers: {
                    "Authorization": `Bearer ${OPENAI_API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        const reply = response.data.choices[0].message.content;
        await message.reply(reply);

    } catch (error) {
        console.error('❌ خطأ في الرد:', error.message);
        await message.reply("آسف، حدث خطأ ولم أستطع الرد الآن.");
    }
});

client.initialize();
