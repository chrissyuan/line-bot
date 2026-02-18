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
      `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001?Authorization=${CWA_API_KEY}&locationName=宜蘭縣`
    );

    const location = response.data.records.location[0];
    const weather = location.weatherElement;

    const wx = weather.find(e => e.elementName === "Wx").time[0].parameter.parameterName;
    const pop = weather.find(e => e.elementName === "PoP").time[0].parameter.parameterName;
    const minT = weather.find(e => e.elementName === "MinT").time[0].parameter.parameterName;
    const maxT = weather.find(e => e.elementName === "MaxT").time[0].parameter.parameterName;

    return `🌤 宜蘭縣 36小時天氣預報\n\n` +
           `天氣：${wx}\n` +
           `降雨機率：${pop}%\n` +
           `氣溫：${minT}°C ~ ${maxT}°C`;

  } catch (error) {
    console.error(error.response?.data || error.message);
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
