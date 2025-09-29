const { Client, LocalAuth } = require("whatsapp-web.js");
const axios = require("axios");
require("dotenv").config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  }
});

client.on("qr", async qr => {
  console.log("🔑 رمز QR:\n", qr);

  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID,
      text: `🔑 رمز QR لتسجيل الدخول إلى واتساب:\n\n${qr}`
    });
    console.log("📤 تم إرسال رمز QR إلى تيليجرام.");
  } catch (err) {
    console.error("❌ فشل إرسال رمز QR إلى تيليجرام:", err.message);
  }
});

client.on("ready", () => {
  console.log("🤖 البوت جاهز ويعمل على حسابك مباشرة.");
});

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
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
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
