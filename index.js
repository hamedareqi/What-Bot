const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fetch = require('node-fetch');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
require('dotenv').config();

// ✅ التحقق من المتغيرات البيئية
console.log("🚀 بدأ تشغيل البوت ... التحقق من المتغيرات البيئية");
console.log("🔑 OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "موجود" : "❌ مفقود");
console.log("🤖 TELEGRAM_BOT_TOKEN:", process.env.TELEGRAM_BOT_TOKEN ? "موجود" : "❌ مفقود");
console.log("📨 TELEGRAM_CHAT_ID:", process.env.TELEGRAM_CHAT_ID ? "موجود" : "❌ مفقود");

// 🔍 اختبار إرسال رسالة إلى تيليجرام
(async () => {
    try {
        const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;

        const response = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: chatId,
                text: "✅ اختبار: تم تشغيل البوت بنجاح وإرسال هذه الرسالة إلى تيليجرام"
            })
        });

        const result = await response.json();
        if (!result.ok) {
            console.error("❌ فشل إرسال الرسالة التجريبية إلى تيليجرام:", result.description);
        } else {
            console.log("✅ تم إرسال الرسالة التجريبية إلى تيليجرام بنجاح.");
        }
    } catch (err) {
        console.error("❌ خطأ في الاتصال بتيليجرام:", err.message);
    }
})();

// 🟢 إعداد بوت واتساب
const client = new Client({
    authStrategy: new LocalAuth({ clientId: "whatsapp-bot" })
});

// 📤 إرسال رمز QR إلى تيليجرام كوثيقة
client.on('qr', async qr => {
    try {
        const imagePath = './qr.png';
        await qrcode.toFile(imagePath, qr);

        const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;

        const formData = new FormData();
        formData.append('chat_id', chatId);
        formData.append('caption', '🔐 رمز QR لتسجيل الدخول إلى بوت واتساب');
        formData.append('document', fs.createReadStream(imagePath));

        const response = await fetch(`https://api.telegram.org/bot${telegramToken}/sendDocument`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        if (!result.ok) {
            console.error('❌ فشل إرسال QR كوثيقة إلى تيليجرام:', result.description);
        } else {
            console.log('✅ تم إرسال رمز QR إلى تيليجرام كوثيقة بنجاح.');
        }

        fs.unlinkSync(imagePath);

    } catch (err) {
        console.error('❌ خطأ في توليد أو إرسال QR:', err.message);
    }
});

// ✅ جاهزية البوت
client.on('ready', () => {
    console.log('🤖 بوت واتساب جاهز للعمل!');
});

// 💬 استقبال الرسائل والرد باستخدام OpenRouter
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
