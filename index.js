const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const GREEN_ID = process.env.GREEN_ID;
const GREEN_TOKEN = process.env.GREEN_TOKEN;

let delay = 60000;
const minDelay = 5000;
const maxDelay = 150000;
const delayStep = 15000;
const maxIdleCycles = 10;
let idleCount = 0;
let isPaused = false;

const userMessages = {}; // { chatId: [msg1, msg2, ..., msg10] }

function loadCommands() {
  try {
    const raw = fs.readFileSync('./commands.json', 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('❌ فشل تحميل ملف الأوامر:', err.message);
    return {};
  }
}

function resumePolling() {
  if (!isPaused) return;
  console.log('🔁 إعادة تشغيل الفحص بعد توقف مؤقت');
  isPaused = false;
  checkMessages();
}

async function checkMessages() {
  if (isPaused) return;

  console.log(`🔄 فحص الرسائل... التأخير الحالي: ${delay / 1000} ثانية`);

  try {
    const response = await axios.get(`https://api.green-api.com/waInstance${GREEN_ID}/ReceiveNotification/${GREEN_TOKEN}`);
    const data = response.data;

    if (data?.body?.typeWebhook === 'incomingMessageReceived') {
      const message = data.body.messageData?.textMessageData?.textMessage;
      const sender = data.body.senderData?.chatId;

      if (message && sender) {
        console.log(`📩 رسالة من ${sender}: ${message}`);

        // حفظ آخر 10 رسائل
        if (!userMessages[sender]) userMessages[sender] = [];
        userMessages[sender].push(message);
        if (userMessages[sender].length > 10) userMessages[sender].shift();

        const commands = loadCommands();
        let reply = commands[message] || '❌ هذا السؤال غير مدعوم حاليًا. يرجى اختيار سؤال من القائمة المسموحة.';

        await axios.post(`https://api.green-api.com/waInstance${GREEN_ID}/SendMessage/${GREEN_TOKEN}`, {
          chatId: sender,
          message: reply
        });

        await axios.delete(`https://api.green-api.com/waInstance${GREEN_ID}/DeleteNotification/${GREEN_TOKEN}/${data.receiptId}`);

        delay = minDelay;
        idleCount = 0;
        console.log(`✅ تم الرد على ${sender}، إعادة الفحص بعد ${delay / 1000} ثانية`);
      }
    } else {
      delay = Math.min(maxDelay, delay + delayStep);
      idleCount++;
      console.log(`😴 لا توجد رسائل، عداد الخمول: ${idleCount}/${maxIdleCycles}`);

      if (idleCount >= maxIdleCycles) {
        console.log('🛑 تم الوصول إلى حد الخمول، سيتم إيقاف الفحص مؤقتًا لتوفير الوقت');
        isPaused = true;
        setTimeout(resumePolling, 10 * 60 * 1000);
        return;
      }
    }
  } catch (error) {
    console.error('❌ خطأ أثناء الفحص:', error.message);
    delay = Math.min(maxDelay, delay + delayStep);
    idleCount++;
  }

  setTimeout(checkMessages, delay);
}

checkMessages();
