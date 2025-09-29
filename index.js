const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fetch = require('node-fetch');
const axios = require('axios');
require('dotenv').config();

// إعداد بوت واتساب
const client = new Client({
    authStrategy: new LocalAuth({ clientId: "whatsapp-bot" })
});

client.on('qr', async qr => {
    try {
        const imageDataUrl = await qrcode.toDataURL(qr);
        const base64Data = imageDataUrl.replace(/^data:image\/png;base64,/, "");

        const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;

        const response = await fetch(`https://api.telegram.org/bot${telegramToken}/sendPhoto`, {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: chatId,
                photo: `data:image/png;base64,${base64Data}`,
                caption: "🔐 رمز QR لتسجيل الدخول إلى بوت واتساب"
            })
        });

        const result = await response.json();
        if (!result.ok) {
            console.error('❌ فشل إرسال QR إلى تيليجرام:', result.description);
        } else {
            console.log('✅ تم إرسال رمز QR إلى تيليجرام بنجاح.');
        }

    } catch (err) {
        console.error('❌ خطأ في توليد أو إرسال QR:', err.message);
    }
});

client.on('ready', () => {
    console.log('🤖 بوت واتساب جاهز للعمل!');
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
                    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        const reply = response.data.choices[0].message.content;
        await message.reply(reply);

    } catch (error) {
        console.error('❌ خطأ في الرد باستخدام OpenRouter:', error.message);
        await message.reply("آسف، حدث خطأ ولم أستطع الرد الآن.");
    }
});

client.initialize();
