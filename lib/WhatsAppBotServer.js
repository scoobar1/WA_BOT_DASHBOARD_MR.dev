// WhatsAppBotServer.js (محدث بمنطق الرد الكامل)
import pkg from "whatsapp-web.js"
const { Client, LocalAuth } = pkg
import qrcode from "qrcode-terminal"
import { Server } from "socket.io"
import http from "http"
import express from "express"
import fs from "fs"
import stringSimilarity from "string-similarity"

class WhatsAppBotServer {
  constructor() {
    this.app = express()
    this.server = http.createServer(this.app)
    this.io = new Server(this.server, {
      cors: { origin: "*" },
    })

    this.client = null
    this.qrCode = null
    this.isConnected = false
    this.startTime = null

    // 🆕 حالات البوت
    this.isPaused = false // إيقاف مؤقت
    this.isActive = true // تشغيل / إيقاف

    this.responses = []
    this.badWords = []
    this.chatMemory = {}
    this.praiseMemory = []
    this.negativeCount = {}
    this.deviceInfo = null

    // عداد الرسائل مع ملف التخزين
    this.statsFile = "./data/stats.json"
    this.messageLog = []

    this.conversationsFile = "./data/conversations.json"
    this.conversations = []

    // تحميل الإحصائيات المحفوظة
    try {
      this.messageLog = JSON.parse(fs.readFileSync(this.statsFile, "utf8"))
    } catch {
      this.messageLog = []
    }

    try {
      this.conversations = JSON.parse(fs.readFileSync(this.conversationsFile, "utf8"))
    } catch {
      this.conversations = []
    }

    // كلمات المدح
    this.praiseKeywords = [
      " شكرا ليك",
      "ربنا يكرمك",
      "الله يخليك",
      "ممتاز",
      "كويس",
      "شكرا ",
      "تسلم جدا ",
      "عظيم ",
      "حلو",
      "رائع",
      "جميل",
      "perfect",
      "great",
      "good",
      "amazing",
    ]

    this.thanksReplies = [
      "تسلم يا فندم 🙌",
      "شكرا على كلامك الحلو 🌹",
      "مبسوط إن الكورس عجبك 🎉",
      "ده من ذوقك والله 🙏",
      "متشكر جدًا يا بطل 💪",
    ]

    this.loadData()
    this.setupExpress()
    this.initializeBot()
    this.setupSocketIO()
  }

  // تحميل البيانات
  loadData() {
    try {
      // تحميل الردود
      const replyFiles = ["./data/MRDEV_RESPON_P1_structured copy.json"]
      this.responses = []

      for (const file of replyFiles) {
        if (!fs.existsSync(file)) {
          console.error(`[Bot Server] ملف الردود غير موجود: ${file}`)
          continue
        }

        const data = JSON.parse(fs.readFileSync(file, "utf8"))
        this.responses = this.responses.concat(data)
      }

      // تحميل الكلمات السيئة
      if (fs.existsSync("./data/badwords.json")) {
        const badWordsData = JSON.parse(fs.readFileSync("./data/badwords.json", "utf8"))
        this.badWords = [...badWordsData.arabic, ...badWordsData.english]
      } else {
        console.error("[Bot Server] ملف الكلمات السيئة غير موجود في مجلد data")
        this.badWords = []
      }

      console.log(`[Bot Server] تم تحميل ${this.responses.length} رد و ${this.badWords.length} كلمة سيئة`)

      // تحقق من نجاح التحميل
      if (this.responses.length === 0) {
        console.error("[Bot Server] ⚠️ لم يتم تحميل أي ردود! تحقق من ملفات البيانات")
      }
    } catch (error) {
      console.error("[Bot Server] خطأ في تحميل البيانات:", error.message)
      this.responses = []
      this.badWords = []
    }
  }

  // تطبيع النص
  normalizeText(text) {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u064B-\u065F]/g, "")
      .replace(/[أإآا]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ؤ/g, "و")
      .replace(/ئ/g, "ي")
      .replace(/\s+/g, " ")
      .trim()
  }

  // تحليل المشاعر
  analyzeSentiment(text) {
    const normalizedText = this.normalizeText(text)

    // تحقق من الكلمات السيئة
    for (const word of this.badWords) {
      if (normalizedText.includes(this.normalizeText(word))) {
        return "abusive"
      }
    }

    // تحقق من كلمات المدح
    for (const word of this.praiseKeywords) {
      if (normalizedText.includes(this.normalizeText(word))) {
        return "positive"
      }
    }

    return "neutral"
  }

  // معالجة الرسائل
  async handleMessage(message) {
    try {
      // تسجيل مفصل لتتبع المشكلة
      console.log(`[DEBUG] 📩 رسالة جديدة من ${message.from}: "${message.body}"`)
      console.log(`[DEBUG] حالة البوت - isActive: ${this.isActive}, isPaused: ${this.isPaused}`)
      console.log(`[DEBUG] وقت الرسالة: ${message.timestamp}, وقت البدء: ${this.startTime}`)

      // 🆕 تحقق من حالة البوت
      if (!this.isActive || this.isPaused) {
        console.log(`[Bot] تم تجاهل الرسالة - البوت ${!this.isActive ? "متوقف" : "مؤقف"}`)
        return
      }

      const messageTime = message.timestamp * 1000 // تحويل إلى milliseconds
      if (this.startTime && messageTime < this.startTime) {
        console.log(
          `[DEBUG] تم تجاهل الرسالة القديمة - وقت الرسالة: ${new Date(messageTime)}, وقت البدء: ${new Date(this.startTime)}`,
        )
        return
      }

      const normalizedMessage = this.normalizeText(message.body)
      const sentiment = this.analyzeSentiment(normalizedMessage)
      const chatId = message.from

      console.log(`[DEBUG] النص المعالج: "${normalizedMessage}" | المشاعر: ${sentiment}`)

      // معالجة الشتائم
      if (sentiment === "abusive") {
        console.log(`[DEBUG] تم اكتشاف شتيمة، سيتم الرد`)
        const replyText = "ياريت نحافظ على الأسلوب 🙏 لو محتاج مساعدة قوللي."
        await message.reply(replyText)

        this.saveConversation(chatId, message.body, replyText)

        // تسجيل الشتيمة
        fs.appendFileSync("./abuse_log.txt", `[${new Date().toISOString()}] ${chatId}: ${message.body}\n`, "utf8")

        // إبلاغ خدمة العملاء
        const supportNumber = "201553420068@c.us"
        const forwardText = `🚨 عميل استخدم لفظ غير لائق.\n\n📱 الرقم: ${chatId}\n📝 الرسالة: "${message.body}"`
        await this.client.sendMessage(supportNumber, forwardText)

        console.log(`⚠️ تم تسجيل الشتيمة وإبلاغ خدمة العملاء.`)
        return
      }

      // معالجة الشكر والمدح
      const foundPraise = this.praiseKeywords.find((k) => normalizedMessage.includes(this.normalizeText(k)))

      if (foundPraise) {
        console.log(`[DEBUG] تم اكتشاف مدح: "${foundPraise}"`)
        const replyText = this.thanksReplies[Math.floor(Math.random() * this.thanksReplies.length)]
        await message.reply(replyText)

        this.saveConversation(chatId, message.body, replyText)

        this.praiseMemory.push({
          from: chatId,
          body: message.body,
          time: new Date().toISOString(),
        })

        // معالجة أخطاء لحفظ الملف
        try {
          fs.writeFileSync("./data/praise_log.json", JSON.stringify(this.praiseMemory, null, 2), "utf8")
        } catch (error) {
          console.error("[DEBUG] خطأ في حفظ ملف المدح:", error)
        }

        console.log(`💖 تم تسجيل رسالة شكر من ${chatId}: "${message.body}"`)
        return
      }

      // تحقق من وجود الردود
      if (!this.responses || this.responses.length === 0) {
        console.log(`[DEBUG] ⚠️ لا توجد ردود محملة! سيتم إعادة تحميل البيانات`)
        this.loadData()

        if (!this.responses || this.responses.length === 0) {
          console.log(`[DEBUG] فشل في تحميل الردود، سيتم الرد بالرد الافتراضي`)
          const fallbackReply = "عذراً، أواجه مشكلة تقنية. يرجى المحاولة مرة أخرى أو التواصل مع الدعم الفني."
          await message.reply(fallbackReply)

          this.saveConversation(chatId, message.body, fallbackReply)

          return
        }
      }

      // البحث عن التطابق (Intent Matching)
      const messageWords = normalizedMessage.split(" ")
      let replied = false

      console.log(`[DEBUG] البحث في ${this.responses.length} رد عن تطابق للكلمات: [${messageWords.join(", ")}]`)

      for (const item of this.responses) {
        const normalizedKeywords = item.keywords.map((k) => this.normalizeText(k))
        let foundMatch = false

        for (const word of messageWords) {
          for (const keyword of normalizedKeywords) {
            const similarity = stringSimilarity.compareTwoStrings(word, keyword)
            if (word.includes(keyword) || similarity >= 0.6) {
              console.log(
                `[DEBUG] ✅ تطابق وُجد! الكلمة: "${word}" مع الكلمة المفتاحية: "${keyword}" (تشابه: ${similarity})`,
              )
              foundMatch = true
              break
            }
          }
          if (foundMatch) break
        }

        if (foundMatch) {
          let replyText

          if (sentiment ===
             "negative",
             "مدايق ",
             "سيئ",
             "انا ادايقت بجد"
            ) {
            const shortestAnswer = item.answer.reduce((a, b) => (a.length <= b.length ? a : b))
            replyText = `${shortestAnswer} 🙏 آسف لو في حاجة مضايقاك`
            this.negativeCount[chatId] = (this.negativeCount[chatId] || 0) + 1
          } else {
            replyText = item.answer[Math.floor(Math.random() * item.answer.length)]
            this.negativeCount[chatId] = 0
          }

          if (this.negativeCount[chatId] >= 2) {
            replyText = "+2واضح إن حضرتك مش مرتاح، خليني أسيبلك رقم خدمة العملاء 📞 01553420068"
            this.negativeCount[chatId] = 0
          }

          console.log(`[DEBUG] سيتم الرد بـ: "${replyText}"`)

          // محاكاة الكتابة
          const chat = await message.getChat()
          await chat.sendStateTyping()
          await new Promise((r) => setTimeout(r, Math.min(replyText.split(" ").length * 300, 3000))) // تحديد حد أقصى للانتظار

          await message.reply(replyText)

          this.saveConversation(chatId, message.body, replyText)

          console.log(`✅ Intent: ${item.intent} | رد: ${replyText}`)
          this.chatMemory[chatId] = { intent: item.intent, time: Date.now() }

          replied = true
          break
        }
      }

      // الرد الافتراضي
      if (!replied) {
        console.log(`[DEBUG] لم يتم العثور على تطابق، سيتم الرد بالرد الافتراضي`)
        const fallbackReplies = [
          "ممكن توضّح قصدك أكتر؟ 🤔",
          "مش فاهم قصدك، تقصد السعر ولا المكان او ممكن تقول عايز اي بالظبط؟",
          "ممكن تعيد صياغة السؤال؟ 🙏",
          "وضح ليا حابب تعرف اي اكثر ",
        ]
        const replyText = fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)]
        await message.reply(replyText)

        this.saveConversation(chatId, message.body, replyText)

        // تسجيل الرسائل غير المطابقة
        let unmatched = []
        try {
          unmatched = JSON.parse(fs.readFileSync("./unmatched_log.json", "utf8"))
        } catch {
          unmatched = []
        }
        unmatched.push({
          from: chatId,
          body: message.body,
          time: new Date().toISOString(),
        })

        try {
          fs.writeFileSync("./unmatched_log.json", JSON.stringify(unmatched, null, 2), "utf8")
        } catch (error) {
          console.error("[DEBUG] خطأ في حفظ ملف الرسائل غير المطابقة:", error)
        }

        console.log(`⚠️ No match for ${chatId}: "${message.body}" (تم تسجيلها)`)
      }
    } catch (error) {
      console.error("[Bot] خطأ في معالجة الرسالة:", error)
      // رد في حالة الخطأ
      try {
        const errorReply = "عذراً، حدث خطأ تقني. يرجى المحاولة مرة أخرى."
        await message.reply(errorReply)
        this.saveConversation(message.from, message.body, errorReply)
      } catch (replyError) {
        console.error("[Bot] خطأ في إرسال رد الخطأ:", replyError)
      }
    }
  }

  // تسجيل الرسائل للإحصائيات
  logMessage() {
    const todayStr = new Date().toISOString().split("T")[0]
    const todayEntry = this.messageLog.find((d) => d.date === todayStr)
    if (todayEntry) {
      todayEntry.count += 1
    } else {
      this.messageLog.push({ date: todayStr, count: 1 })
    }

    if (this.messageLog.length > 30) {
      this.messageLog.shift()
    }

    // حفظ الإحصائيات في ملف
    fs.writeFileSync(this.statsFile, JSON.stringify(this.messageLog, null, 2), "utf8")
    this.io.emit("messageStats", this.getStats())
  }

  // دالة حساب وقت التشغيل
  getUptime() {
    if (!this.startTime) return 0
    return Math.floor((Date.now() - this.startTime) / 1000)
  }

  // الإحصائيات
  getStats() {
    const todayStr = new Date().toISOString().split("T")[0]
    const todayCount = this.messageLog.find((d) => d.date === todayStr)?.count || 0
    const total30Days = this.messageLog.reduce((sum, d) => sum + d.count, 0)
    return {
      today: todayCount,
      total30Days,
      daily: this.messageLog,
    }
  }

  saveConversation(phoneNumber, incomingMessage, botReply) {
    const conversation = {
      id: `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      phoneNumber: phoneNumber.replace("@c.us", ""),
      incomingMessage,
      botReply,
      timestamp: new Date(),
    }

    this.conversations.unshift(conversation) // إضافة في المقدمة للترتيب الزمني

    // الاحتفاظ بآخر 1000 محادثة فقط
    if (this.conversations.length > 1000) {
      this.conversations = this.conversations.slice(0, 1000)
    }

    // حفظ في الملف
    try {
      fs.writeFileSync(this.conversationsFile, JSON.stringify(this.conversations, null, 2), "utf8")
    } catch (error) {
      console.error("[Bot Server] خطأ في حفظ المحادثات:", error)
    }

    // إرسال التحديث للفرونت إند
    this.io.emit("conversationUpdate", conversation)
  }

  setupExpress() {
    this.app.use(express.json())

    this.app.get("/api/bot/status", (req, res) => {
      res.json({
        isPaused: this.isPaused,
        isActive: this.isActive,
        uptime: this.getUptime(),
        isConnected: this.isConnected,
        qrCode: this.qrCode,
        deviceInfo: this.deviceInfo,
      })
    })

    this.app.get("/api/messages/stats", (req, res) => {
      res.json(this.getStats())
    })

    this.app.get("/api/chat/memory", (req, res) => {
      res.json(this.chatMemory)
    })

    this.app.get("/api/praise/log", (req, res) => {
      res.json(this.praiseMemory)
    })

    this.app.get("/api/conversations", (req, res) => {
      const { search, limit = 50, offset = 0 } = req.query

      let filteredConversations = this.conversations

      // تطبيق البحث إذا وُجد
      if (search) {
        const searchTerm = search.toLowerCase()
        filteredConversations = this.conversations.filter(
          (conv) =>
            conv.phoneNumber.toLowerCase().includes(searchTerm) ||
            conv.incomingMessage.toLowerCase().includes(searchTerm) ||
            conv.botReply.toLowerCase().includes(searchTerm),
        )
      }

      // تطبيق التصفح (pagination)
      const paginatedConversations = filteredConversations.slice(
        Number.parseInt(offset),
        Number.parseInt(offset) + Number.parseInt(limit),
      )

      // حساب الإحصائيات
      const totalConversations = filteredConversations.length
      const uniqueUsers = new Set(filteredConversations.map((c) => c.phoneNumber)).size
      const today = new Date().toISOString().split("T")[0]
      const todayConversations = filteredConversations.filter(
        (c) => new Date(c.timestamp).toISOString().split("T")[0] === today,
      ).length

      res.json({
        conversations: paginatedConversations,
        stats: {
          total: totalConversations,
          uniqueUsers,
          today: todayConversations,
        },
        pagination: {
          limit: Number.parseInt(limit),
          offset: Number.parseInt(offset),
          hasMore: Number.parseInt(offset) + Number.parseInt(limit) < totalConversations,
        },
      })
    })

    this.app.get("/api/conversations/export", (req, res) => {
      const { search } = req.query

      let filteredConversations = this.conversations

      if (search) {
        const searchTerm = search.toLowerCase()
        filteredConversations = this.conversations.filter(
          (conv) =>
            conv.phoneNumber.toLowerCase().includes(searchTerm) ||
            conv.incomingMessage.toLowerCase().includes(searchTerm) ||
            conv.botReply.toLowerCase().includes(searchTerm),
        )
      }

      res.json(filteredConversations)
    })

    // API endpoints للتحكم ( كبديل للـ Socket)
    this.app.post("/api/bot/toggle-pause", (req, res) => {
      this.isPaused = !this.isPaused
      console.log(`[Bot Server] Bot ${this.isPaused ? "paused" : "resumed"} via API`)
      this.io.emit("botStatus", {
        isConnected: this.isConnected,
        qrCode: this.qrCode,
        deviceInfo: this.deviceInfo,
        isPaused: this.isPaused,
        isActive: this.isActive,
        uptime: this.getUptime(),
      })
      res.json({ success: true, isPaused: this.isPaused })
    })

    this.app.post("/api/messages/reset", (req, res) => {
      try {
        this.messageLog = []
        fs.writeFileSync(this.statsFile, JSON.stringify(this.messageLog, null, 2), "utf8")
        this.io.emit("messageStats", this.getStats())
        res.json({ success: true, message: "Stats reset successfully" })
      } catch (err) {
        res.status(500).json({ error: err.message })
      }
    })
  }

  setupSocketIO() {
    this.io.on("connection", (socket) => {
      console.log("[Bot Server] Frontend connected:", socket.id)

      // إرسال الحالة الكاملة عند الاتصال
      socket.emit("botStatus", {
        isConnected: this.isConnected,
        qrCode: this.qrCode,
        deviceInfo: this.deviceInfo,
        isPaused: this.isPaused,
        isActive: this.isActive,
        uptime: this.getUptime(),
      })

      socket.emit("messageStats", this.getStats())

      socket.emit("conversationsData", {
        conversations: this.conversations.slice(0, 50),
        stats: {
          total: this.conversations.length,
          uniqueUsers: new Set(this.conversations.map((c) => c.phoneNumber)).size,
          today: this.conversations.filter(
            (c) => new Date(c.timestamp).toISOString().split("T")[0] === new Date().toISOString().split("T")[0],
          ).length,
        },
      })

      // معالجة أحداث Socket من الفرونت إند
      socket.on("getBotStatus", () => {
        socket.emit("botStatus", {
          isConnected: this.isConnected,
          qrCode: this.qrCode,
          deviceInfo: this.deviceInfo,
          isPaused: this.isPaused,
          isActive: this.isActive,
          uptime: this.getUptime(),
        })
      })

      // إيقاف/تشغيل البوت مؤقتاً
      socket.on("pauseBot", () => {
        console.log("[Bot Server] Bot paused via socket")
        this.isPaused = true
        this.io.emit("botStatus", {
          isConnected: this.isConnected,
          qrCode: this.qrCode,
          deviceInfo: this.deviceInfo,
          isPaused: this.isPaused,
          isActive: this.isActive,
          uptime: this.getUptime(),
        })
      })

      // استئناف البوت
      socket.on("resumeBot", () => {
        console.log("[Bot Server] Bot resumed via socket")
        this.isPaused = false
        this.io.emit("botStatus", {
          isConnected: this.isConnected,
          qrCode: this.qrCode,
          deviceInfo: this.deviceInfo,
          isPaused: this.isPaused,
          isActive: this.isActive,
          uptime: this.getUptime(),
        })
      })

      // إعادة تشغيل البوت
      socket.on("requestBotRestart", async () => {
        try {
          console.log("[Bot Server] Bot restart requested via socket")
          if (this.client) {
            await this.client.destroy()
          }
          this.isConnected = false
          this.qrCode = null
          this.deviceInfo = null

          // إعادة تهيئة البوت
          setTimeout(() => {
            this.initializeBot()
          }, 2000)

          this.io.emit("botStatus", {
            isConnected: false,
            qrCode: null,
            deviceInfo: null,
            isPaused: this.isPaused,
            isActive: this.isActive,
            uptime: 0,
          })
        } catch (error) {
          console.error("[Bot Server] Error restarting bot:", error)
        }
      })

      // إعادة تعيين الجلسة
      socket.on("resetSession", async () => {
        try {
          console.log("[Bot Server] Session reset requested via socket")
          if (this.client) {
            await this.client.destroy()
          }

          // حذف ملفات الجلسة
          const sessionPath = "./session"
          if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true })
          }

          this.isConnected = false
          this.qrCode = null
          this.deviceInfo = null

          // إعادة تهيئة البوت بجلسة جديدة
          setTimeout(() => {
            this.initializeBot()
          }, 2000)

          this.io.emit("botStatus", {
            isConnected: false,
            qrCode: null,
            deviceInfo: null,
            isPaused: this.isPaused,
            isActive: this.isActive,
            uptime: 0,
          })
        } catch (error) {
          console.error("[Bot Server] Error resetting session:", error)
        }
      })
    })
  }

  initializeBot() {
    this.client = new Client({
      authStrategy: new LocalAuth({ dataPath: "./session" }),
      puppeteer: { headless: true, args: ["--no-sandbox"] },
    })

    this.client.on("qr", (qr) => {
      console.log("[Bot Server] QR Code generated")
      this.qrCode = qr
      this.isConnected = false
      this.io.emit("botStatus", { isConnected: false, qrCode: qr })
      qrcode.generate(qr, { small: true })
    })

    this.client.on("ready", () => {
      console.log("✅ [Bot Server] Bot is ready!")
      this.isConnected = true
      this.qrCode = null
      this.startTime = Date.now() // تسجيل وقت بدء التشغيل

      // تحقق من تحميل البيانات عند الاستعداد
      if (this.responses.length === 0) {
        console.log("[Bot Server] إعادة تحميل البيانات عند الاستعداد...")
        this.loadData()
      }

      const info = this.client.info
      this.deviceInfo = {
        name: info.pushname || "جهاز غير معروف",
        phone: info.wid?.user || "غير متوفر",
        platform: info.platform || "غير معروف",
      }

      console.log(`[Bot Server] معلومات الجهاز: ${JSON.stringify(this.deviceInfo)}`)

      this.io.emit("botStatus", {
        isConnected: true,
        qrCode: null,
        deviceInfo: this.deviceInfo,
        isPaused: this.isPaused,
        isActive: this.isActive,
        uptime: this.getUptime(),
      })
    })

    // معالجة الرسائل الواردة
    this.client.on("message", async (message) => {
      // تحقق من نوع الرسالة
      if (message.type !== "chat") {
        console.log(`[DEBUG] تم تجاهل رسالة من نوع: ${message.type}`)
        return
      }

      if (message.fromMe) {
        console.log(`[DEBUG] تم تجاهل رسالة من البوت نفسه`)
        return
      }

      console.log(`[DEBUG] 🔄 معالجة رسالة جديدة...`)

      // تسجيل الإحصائيات
      this.logMessage()

      // معالجة الرسالة والرد عليها
      await this.handleMessage(message)
    })

    this.client.on("disconnected", (reason) => {
      console.log("❌ [Bot Server] Client was logged out:", reason)
      this.isConnected = false
      this.io.emit("botStatus", { isConnected: false })
    })

    this.client.initialize()

    // مسح الذاكرة كل 15 دقيقة
    setInterval(
      () => {
        this.chatMemory = {}
        console.log("🧹 تم مسح الذاكرة (كل 15 دقيقة).")
      },
      15 * 60 * 1000,
    )
  }

  start(port = 3001) {
    this.server.listen(port, () => {
      console.log(`🚀 [Bot Server] WhatsApp Bot Server running on port ${port}`)
    })
  }
}

export default WhatsAppBotServer
