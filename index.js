require("dotenv").config();
const express = require("express");
const axios = require("axios");
const line = require("@line/bot-sdk");

const app = express();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new line.Client(config);
const CWA_API_KEY = process.env.CWA_API_KEY;

app.use(express.json());

/* ===============================
   LINE Webhook
================================ */
app.post("/callback", async (req, res) => {
  try {
    const events = req.body.events;

    for (const event of events) {
      if (event.type === "message" && event.message.type === "text") {
        const location = event.message.text.trim();
        const weatherText = await getWeather(location);

        await client.replyMessage(event.replyToken, {
          type: "text",
          text: weatherText
        });
      }
    }

    res.status(200).send("OK");
  } catch (err) {
    console.log("Webhook錯誤:", err.message);
    res.status(500).end();
  }
});

/* ===============================
   主天氣函式
================================ */
async function getWeather(locationName) {
  try {
    const url = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001?Authorization=${CWA_API_KEY}&locationName=${encodeURIComponent(locationName)}`;

    const res = await axios.get(url);
    const location = res.data.records.location[0];

    if (!location) return "⚠️ 找不到此地區";

    const wx = location.weatherElement.find(e => e.elementName === "Wx").time;
    const pop = location.weatherElement.find(e => e.elementName === "PoP").time;
    const minT = location.weatherElement.find(e => e.elementName === "MinT").time;
    const maxT = location.weatherElement.find(e => e.elementName === "MaxT").time;

    const now = new Date();
    const nowStr = now.toLocaleString("zh-TW", { hour12: false });

    let currentIndex = wx.findIndex(t => {
      const start = new Date(t.startTime);
      const end = new Date(t.endTime);
      return now >= start && now < end;
    });

    if (currentIndex === -1) currentIndex = 0;

    const currentTemp = averageTemp(minT, maxT, currentIndex);
    const currentRain = safeValue(pop, currentIndex);
    const currentWeather = safeValue(wx, currentIndex);

    /* ===== 未來 3 個 3小時 ===== */
    let futureText = "";

    for (let i = currentIndex + 1; i <= currentIndex + 3 && i < wx.length; i++) {
      const start = new Date(wx[i].startTime);
      const end = new Date(wx[i].endTime);

      const timeStr =
        start.getHours().toString().padStart(2, "0") + ":00-" +
        end.getHours().toString().padStart(2, "0") + ":00";

      const temp = averageTemp(minT, maxT, i);
      const rain = safeValue(pop, i);
      const weather = safeValue(wx, i);

      futureText += `${timeStr} ${getWeatherEmoji(weather)} ${temp}°C ☔${rain}% ${weather}\n`;
    }

    /* ===== 五天 ===== */
    const fiveDay = await getFiveDayWeather(locationName);

    return `🕒 ${nowStr}

📌 目前天氣
${getWeatherEmoji(currentWeather)} ${currentTemp}°C ☔${currentRain}% ${currentWeather}

📈 未來9小時 (逐3小時)
${futureText}

📅 未來5天預報
${fiveDay}

資料來源：中央氣象署`;

  } catch (err) {
    console.log("天氣錯誤:", err.message);
    return "⚠️ 無法取得天氣資料";
  }
}

/* ===============================
   五天天氣
================================ */
async function getFiveDayWeather(locationName) {
  try {
    const url = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-091?Authorization=${CWA_API_KEY}&locationName=${encodeURIComponent(locationName)}`;

    const res = await axios.get(url);
    const location = res.data.records.locations[0].location[0];

    const wx = location.weatherElement.find(e => e.elementName === "Wx").time;
    const pop = location.weatherElement.find(e => e.elementName === "PoP12h").time;
    const minT = location.weatherElement.find(e => e.elementName === "MinT").time;
    const maxT = location.weatherElement.find(e => e.elementName === "MaxT").time;

    let result = "";

    for (let i = 0; i < 5 && i < wx.length; i++) {
      const date = new Date(wx[i].startTime);

      const dateStr =
        (date.getMonth() + 1).toString().padStart(2, "0") + "/" +
        date.getDate().toString().padStart(2, "0");

      const weather = wx[i].elementValue[0].value;
      const rain = pop[i].elementValue[0].value;
      const minTemp = minT[i].elementValue[0].value;
      const maxTemp = maxT[i].elementValue[0].value;

      result += `${dateStr} ${getWeatherEmoji(weather)} ${minTemp}~${maxTemp}°C ☔${rain}% ${weather}\n`;
    }

    return result;

  } catch (err) {
    console.log("五天錯誤:", err.message);
    return "";
  }
}

/* ===============================
   工具函式
================================ */

function averageTemp(minT, maxT, index) {
  const min = parseInt(minT[index]?.parameter?.parameterName || 0);
  const max = parseInt(maxT[index]?.parameter?.parameterName || 0);
  return Math.round((min + max) / 2);
}

function safeValue(arr, index) {
  return arr[index]?.parameter?.parameterName || "--";
}

function getWeatherEmoji(weather) {
  if (!weather) return "🌤️";
  if (weather.includes("雷")) return "⛈️";
  if (weather.includes("雨")) return "🌧️";
  if (weather.includes("雲")) return "☁️";
  if (weather.includes("晴")) return "☀️";
  return "🌤️";
}

/* ===============================
   啟動伺服器
================================ */

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("天氣機器人正在連接連接埠 " + PORT + " 上運行");
});
