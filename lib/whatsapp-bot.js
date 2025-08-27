// lib/whatsapp-bot.js
import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;

import qrcode from "qrcode-terminal";
import fs from "fs";
import stringSimilarity from "string-similarity";

// ================= تحميل البيانات =================
const replyFiles = [
  "./MRDEV_RESPON_P1_structured copy.json"

];

let replies = [];
for (const file of replyFiles) {
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  replies = replies.concat(data);
}

const badWordsData = JSON.parse(fs.readFileSync("./badwords.json", "utf8"));
const badWords = [...badWordsData.arabic, ...badWordsData.english];

// ================= إعداد الميموري =================
let startTime = null;
let chatMemory = {};
const praiseMemory = [];
const negativeCount = {};

// ================= كلمات مدح =================
const praiseKeywords = [
  " شكرا ليك",
  "ربنا يكرمك",
  "الله يخليك",
  "ممتاز",
  "كويس",
  "حلو",
  "رائع",
  "جميل",
  "perfect",
  "great",
  "good",
  "amazing",
];
const thanksReplies = [
  "تسلم يا فندم 🙌",
  "شكرا على كلامك الحلو 🌹",
  "مبسوط إن الكورس عجبك 🎉",
  "ده من ذوقك والله 🙏",
  "متشكر جدًا يا بطل 💪",
];

// ================= تهيئة البوت =================
export const client = new Client({
  authStrategy: new LocalAuth({ dataPath: "./session" }),
  puppeteer: { headless: true },
});

// ================= دوال مساعدة =================
function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u064B-\u065F]/g, "")
    .replace(/[أإآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

function analyzeSentiment(text) {
  for (const word of badWords) {
    if (text.includes(normalizeText(word))) return "abusive";
  }
  for (const word of praiseKeywords) {
    if (text.includes(normalizeText(word))) return "positive";
  }
  return "neutral";
}

// ================= QR CODE =================
client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

// ================= Bot Ready =================
client.on("ready", () => {
  console.log("✅ البوت اشتغل بنجاح! الجلسة محفوظة.");
  startTime = Math.floor(Date.now() / 1000);
});

// ================= Message Handler =================
client.on("message", async (message) => {
  if (message.timestamp < startTime) return;

  const normalizedMessage = normalizeText(message.body);
  const sentiment = analyzeSentiment(normalizedMessage);
  const chatId = message.from;

  console.log(`📩 [${chatId}] ${message.body} | Sentiment: ${sentiment}`);

  // الشتائم
  if (sentiment === "abusive") {
    await message.reply("ياريت نحافظ على الأسلوب 🙏 لو محتاج مساعدة قوللي.");
    fs.appendFileSync(
      "./abuse_log.txt",
      `[${new Date().toISOString()}] ${chatId}: ${message.body}\n`,
      "utf8"
    );
    const supportNumber = "201553420068@c.us";
    const forwardText = `🚨 عميل استخدم لفظ غير لائق.\n\n📱 الرقم: ${chatId}\n📝 الرسالة: "${message.body}"`;
    await client.sendMessage(supportNumber, forwardText);
    console.log(`⚠️ تم تسجيل الشتيمة وإبلاغ خدمة العملاء.`);
    return;
  }

  // الشكر
  const foundPraise = praiseKeywords.find((k) =>
    normalizedMessage.includes(normalizeText(k))
  );
  if (foundPraise) {
    const replyText = thanksReplies[Math.floor(Math.random() * thanksReplies.length)];
    await message.reply(replyText);

    praiseMemory.push({ from: chatId, body: message.body, time: new Date().toISOString() });
    fs.writeFileSync("./praise_log.json", JSON.stringify(praiseMemory, null, 2), "utf8");

    console.log(`💖 تم تسجيل رسالة شكر من ${chatId}: "${message.body}"`);
    return;
  }

  // Intent Matching
  const messageWords = normalizedMessage.split(" ");
  let replied = false;

  for (const item of replies) {
    const normalizedKeywords = item.keywords.map((k) => normalizeText(k));
    let foundMatch = false;

    for (const word of messageWords) {
      for (const keyword of normalizedKeywords) {
        const similarity = stringSimilarity.compareTwoStrings(word, keyword);
        if (word.includes(keyword) || similarity >= 0.6) {
          foundMatch = true;
          break;
        }
      }
      if (foundMatch) break;
    }

    if (foundMatch) {
      let replyText;

      if (sentiment === "negative") {
        const shortestAnswer = item.answer.reduce((a, b) => (a.length <= b.length ? a : b));
        replyText = `${shortestAnswer} 🙏 آسف لو في حاجة مضايقاك`;
        negativeCount[chatId] = (negativeCount[chatId] || 0) + 1;
      } else {
        replyText = item.answer[Math.floor(Math.random() * item.answer.length)];
        negativeCount[chatId] = 0;
      }

      if (negativeCount[chatId] >= 2) {
        replyText = "واضح إن حضرتك مش مرتاح، خليني أسيبلك رقم خدمة العملاء 📞 010xxxx";
        negativeCount[chatId] = 0;
      }

      const chat = await message.getChat();
      await chat.sendStateTyping();
      await new Promise((r) => setTimeout(r, replyText.split(" ").length * 300));
      await message.reply(replyText);

      console.log(`✅ Intent: ${item.intent} | رد: ${replyText}`);
      chatMemory[chatId] = { intent: item.intent, time: Date.now() };

      replied = true;
      break;
    }
  }

  if (!replied) {
    const fallbackReplies = [
      "ممكن توضّح قصدك أكتر؟ 🤔",
      "مش فاهم قصدك، تقصد السعر ولا المكان او ممكن تقول عايز اي بالظبط؟",
      "ممكن تعيد صياغة السؤال؟ 🙏",
    ];
    const replyText = fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
    await message.reply(replyText);

    let unmatched = [];
    try {
      unmatched = JSON.parse(fs.readFileSync("./unmatched_log.json", "utf8"));
    } catch {
      unmatched = [];
    }
    unmatched.push({ from: chatId, body: message.body, time: new Date().toISOString() });
    fs.writeFileSync("./unmatched_log.json", JSON.stringify(unmatched, null, 2), "utf8");

    console.log(`⚠️ No match for ${chatId}: "${message.body}" (تم تسجيلها)`);
  }
});

// مسح الذاكرة كل 15 دقيقة
setInterval(() => {
  chatMemory = {};
  console.log("🧹 تم مسح الذاكرة (كل 15 دقيقة).");
}, 15 * 60 * 1000);

// Run
client.initialize();
