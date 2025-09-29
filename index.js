const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
require('dotenv').config();

// إعداد بوت واتساب
const client = new Client({
    authStrategy: new LocalAuth({ clientId: "whatsapp-bot" })
});

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
    console.log('✅ امسح رمز QR على واتساب لتسجيل الدخول.');
});

client.on('ready', () => {
    console.log('🤖 بوت واتساب جاهز للعمل!');
});

// استقبال الرسائل والرد باستخدام OpenRouter
client.on('message', async message => {
    console.log('📩 رسالة واردة:', message.body);

    try {
        const response = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                model: "mistral/mistral-7b-instruct", // يمكنك تغييره لأي نموذج مدعوم
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
