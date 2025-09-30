# WhatsApp Bot ذكي

بوت واتساب يعمل على Replit باستخدام OpenRouter وTelegram.  
يولد QR مرة واحدة فقط، ويحفظ الجلسة، ويرد على الرسائل الذكية.

## 🔧 المتطلبات
- Node.js مثبت
- حساب Telegram Bot
- مفتاح OpenRouter API
- Replit (اختياري)

## ⚙️ خطوات التشغيل
1. استيراد المشروع من GitHub إلى Replit أو العمل محليًا.
2. إضافة Secrets في Replit:
   - `TELEGRAM_BOT_TOKEN` : توكن بوت Telegram
   - `TELEGRAM_CHAT_ID` : معرف الدردشة في Telegram
   - `OPENROUTER_API_KEY` : مفتاح OpenRouter
3. تشغيل البوت:
   ```bash
   npm install
   npm start
