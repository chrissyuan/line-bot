const express = require("express");
const line = require("@line/bot-sdk");
const axios = require("axios");

const app = express();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const CWA_API_KEY = process.env.CWA_API_KEY;

const client = new line.Client(config);

app.get("/", (req, res) => {
  res.send("LINE Weather Bot Running ✅");
});

app.post("/webhook", line.middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then(() => res.sendStatus(200))
    .catch((err) => {
      console.error(err);
      res.sendStatus(500);
    });
});

async function getCurrentWeather() {
  try {
    const response = await axios.get(
      `https://opendata.cwa.gov.tw/api/v1/rest/datastore/O-A0003-001?Authorization=${CWA_API_KEY}&LocationName=宜蘭`
    );

    console.log("API 回傳資料：");
    console.log(JSON.stringify(response.data, null, 2));

    if (!response.data.records || !response.data.records.location) {
      return "⚠️ API 沒有回傳資料";
    }

    const location = response.data.records.location[0];

    if (!location) {
      return "⚠️ 找不到宜蘭資料";
    }

    const elements = location.weatherElement;

    const temp = elements.find(e => e.elementName === "TEMP")?.elementValue;
    const humd = elements.find(e => e.elementName === "HUMD")?.elementValue;

    if (!temp || !humd) {
      return "⚠️ 天氣資料格式異常";
    }

    return `🌤 宜蘭目前天氣\n🌡 溫度：${temp}°C\n💧 濕度：${Math.round(humd * 100)}%`;

  } catch (error) {
    console.error("API 錯誤：", error.response?.data || error.message);
    return "⚠️ 無法取得即時天氣資料";
  }
}


async function handleEvent(event) {
  if (event.type !== "message" || event.message.type !== "text") {
    return Promise.resolve(null);
  }

  const msg = event.message.text.trim();

  if (msg === "現在天氣") {
    const weather = await getCurrentWeather();
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: weather
    });
  }

  return client.replyMessage(event.replyToken, {
    type: "text",
    text: "請輸入：現在天氣"
  });
}

const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log("Weather Bot running on port", port);
});
