const express = require("express");
const line = require("@line/bot-sdk");

const app = express();

// LINE 設定（之後會接環境變數）
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || "先隨便填",
  channelSecret: process.env.CHANNEL_SECRET || "先隨便填"
};

const client = new line.Client(config);

// Webhook 接收點
app.post("/webhook", line.middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then(() => res.sendStatus(200))
    .catch(() => res.sendStatus(500));
});

function handleEvent(event) {
  if (event.type !== "message" || event.message.type !== "text") {
    return Promise.resolve(null);
  }

  const msg = event.message.text.trim();
  let reply = "";

  if (msg === "天氣") {
    reply = "☀️ 宜蘭今日天氣：多雲，記得帶雨具 ☂️";
  } else if (msg === "宜蘭景點") {
    reply = "📍 宜蘭景點推薦：礁溪溫泉、梅花湖、蘭陽博物館";
  } else if (msg === "宜蘭美食") {
    reply = "🍜 宜蘭美食：三星蔥油餅、卜肉、鴨賞";
  } else {
    reply =
      "🤖 可用指令：\n" +
      "1️⃣ 天氣\n" +
      "2️⃣ 宜蘭景點\n" +
      "3️⃣ 宜蘭美食\n" +
      "請直接輸入關鍵字";
  }

  return client.replyMessage(event.replyToken, {
    type: "text",
    text: reply
  });
}

// 啟動伺服器
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("LINE Bot server running on port", port);
});
