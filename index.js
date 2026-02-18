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
    // 36小時預報
    const res36 = await axios.get(
      `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001?Authorization=${CWA_API_KEY}&locationName=宜蘭縣`
    );

    const location36 = res36.data.records.location[0];
    const elements36 = location36.weatherElement;

    const wx = elements36.find(e => e.elementName === "Wx").time;
    const pop = elements36.find(e => e.elementName === "PoP").time;
    const minT = elements36.find(e => e.elementName === "MinT").time[0].parameter.parameterName;
    const maxT = elements36.find(e => e.elementName === "MaxT").time[0].parameter.parameterName;

    // 組 6 小時區間（前 3 段）
    let sixHourText = "";
    for (let i = 0; i < 3; i++) {
      const start = wx[i].startTime.substring(11, 16);
      const end = wx[i].endTime.substring(11, 16);
      const weather = wx[i].parameter.parameterName;
      const rain = pop[i].parameter.parameterName;

      sixHourText += `${start}-${end} ${weather} ☔${rain}%\n`;
    }

    

    return (
      `📍 宜蘭縣天氣總覽\n` +
      `━━━━━━━━━━━━\n\n` +
      `🌡 氣溫：${minT}°C ~ ${maxT}°C\n` +
      `☁️ 天氣：${wx[0].parameter.parameterName}\n` +
      `☔ 降雨機率：${pop[0].parameter.parameterName}%\n\n` +
      `🕒 未來 6 小時區間\n` +
      sixHourText +
      `\n📅 未來 5 天\n` +
      weekText +
      `━━━━━━━━━━━━\n資料來源：中央氣象署`
    );

  } catch (error) {
  console.log("錯誤完整內容：");
  console.log(error.response?.data || error.message);
  return "⚠️ 無法取得天氣資料";
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
