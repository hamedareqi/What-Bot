const { Client, LocalAuth } = require("whatsapp-web.js");
const axios = require("axios");
const QRCode = require("qrcode");
require("dotenv").config();

// قراءة المفاتيح من البيئة
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  }
});

// إرسال رمز QR إلى تيليجرام كصورة
client.on("qr", async qr => {
  console.log("🔑 رمز QR:\n", qr);

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

// تأكيد جاهزية البوت
client.on("ready", () => {
  console.log("🤖 البوت جاهز ويعمل على حسابك مباشرة.");
});

// استقبال الرسائل والرد باستخدام OpenRouter
client.on("message", async msg => {
  const incoming = msg.body;
  console.log("📩 رسالة واردة:", incoming);

  try {
    const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
      model: "openai/gpt-3.5-turbo",
      messages: [
        { role: "system", content: "أنت مساعد ودود." },
        { role: "user", content: incoming }
      ]
    }, {
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      }
    });

    const reply = response.data.choices[0].message.content;
    console.log("✅ تم إرسال الرد:", reply);
    msg.reply(reply);
  } catch (error) {
    console.error("❌ خطأ أثناء توليد الرد:", error.response?.data || error.message);
    msg.reply("آسف، حدث خطأ ولم أستطع الرد الآن.");
  }
});

client.initialize();
