import { Server } from "socket.io";
import { Client, LocalAuth } from "whatsapp-web.js";

// ---- إعداد Socket.IO على بورت 3001 ----
const io = new Server(3001, {
  cors: { origin: "*" },
});

console.log("[v0] Socket.IO server running on port 3001");

// ---- تهيئة البوت ----
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: "./session" }),
  puppeteer: { headless: true },
});

client.on("qr", (qr) => {
  console.log("[v0] QR Code in terminal:", qr);
  io.emit("qr", qr); // أرسل الـ QR code للـ frontend
});

client.on("ready", () => {
  console.log("[v0] Bot is ready!");
  io.emit("botStatus", { isConnected: true, qrCode: null });
});

client.on("auth_failure", (msg) => {
  console.error("[v0] Auth failure:", msg);
  io.emit("botStatus", { isConnected: false, qrCode: null });
});

client.initialize();

// ---- Endpoint مباشر (اختياري) ----
io.on("connection", (socket) => {
  console.log("[v0] Frontend connected:", socket.id);

  socket.on("requestBotRestart", () => {
    console.log("[v0] Bot restart requested from frontend");
    client.initialize();
  });
});
