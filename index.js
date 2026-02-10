const express = require("express");
const line = require("@line/bot-sdk");

const app = express();

// 🔐 LINE 設定（先直接寫死，確認成功後再改成環境變數）
const config = {
  channelAccessToken:
    "3F9MwlZZG8+AU1LgxITDqSDHT70p2Yzx30lBu5ucIPkyKViyhbuqbMO95xcoE15KC5osmre/YT3txK2LDfGJtrPLaY66POtPCjc/7A38O8aQWQHHBw3hb2E1gtDZR/C0h+h0mSAgUGt4VpTfenKkpQdB04t89/1O/w1cDnyilFU=",
  channelSecret: "357b30a4ab210bafd6617371519020b0"
};

const client = new line.Client(config);

// 👉 給 Render 用的首頁（不再黑畫面，純測試）
app.get("/", (req, res) => {
  res.send("LINE Bot is running ✅");
});

// 👉 Webhook（LINE 只會打這裡）
app.post("/webhook", line.middleware(config), (req, res) => {
  console.log("✅ Webhook hit");
  console.log(JSON.stringify(req.body));

  Promise.all(req.body.events.map(handleEvent))
    .then(() => res.sendStatus(200))
    .catch((err) => {
      console.error(err);
      res.sendStatus(500);
    });
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
    reply = "🍜 宜蘭美食推薦：三星蔥油餅、卜肉、鴨賞";
  } else {
    reply =
      "🤖 可用指令：\n" +
      "1️⃣ 天氣\n" +
      "2️⃣ 宜蘭景點\n" +
      "3️⃣ 宜蘭美食\n\n" +
      "請直接輸入關鍵字";
  }

  return client.replyMessage(event.replyToken, {
    type: "text",
    text: reply
  });
}

// 🚀 啟動伺服器（Render 會自動給 PORT）
const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log("LINE Bot 伺服器運行在 port", port);
});
