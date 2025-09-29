const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();

// إعداد OpenAI API
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// إعداد بوت واتساب
const client = new Client({
    authStrategy: new LocalAuth({ clientId: "whatsapp-bot" })
});

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
    console.log('امسح رمز QR على واتساب لتسجيل الدخول.');
});

client.on('ready', () => {
    console.log('بوت واتساب جاهز للعمل!');
});

// استقبال الرسائل والرد باستخدام AI
client.on('message', async message => {
    console.log('رسالة واردة:', message.body);

    try {
        const response = await openai.createChatCompletion({
            model: "gpt-4", // يمكنك تغيير النموذج حسب OpenRouter/Hugging Face
            messages: [
                { role: "system", content: "أنت مساعد ودود للرد على رسائل العملاء على واتساب." },
                { role: "user", content: message.body }
            ],
            max_tokens: 500
        });

        const reply = response.data.choices[0].message.content;
        await message.reply(reply);

    } catch (error) {
        console.error('خطأ في الرد باستخدام AI:', error);
        await message.reply("آسف، حدث خطأ ولم أستطع الرد الآن.");
    }
});

client.initialize();
