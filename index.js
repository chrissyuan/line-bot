const express = require("express");
const axios = require("axios");
const line = require("@line/bot-sdk");

const app = express();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const CWA_API_KEY = process.env.CWA_API_KEY;
const client = new line.Client(config);

app.use("/webhook", line.middleware(config));

/* =========================
   天氣 Emoji 判斷
========================= */
function getWeatherEmoji(text) {
  if (!text) return "";
  if (text.includes("雷")) return "⛈";
  if (text.includes("雨")) return "🌧";
  if (text.includes("雲")) return "☁️";
  if (text.includes("晴")) return "☀️";
  if (text.includes("陰")) return "🌥";
  return "🌤";
}

/* =========================
   目前天氣（自動氣象站）
   O-A0001-001
========================= */
async function getCurrentWeather() {
  try {
    const url = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/O-A0001-001?Authorization=${CWA_API_KEY}&StationName=礁溪`;

    const res = await axios.get(url);

    if (!res.data.records.Station.length) {
      return null;
    }

    const station = res.data.records.Station[0];
    const element = station.WeatherElement;

    return {
      temp: element.AirTemperature || "--",
      rain: element.Now?.Precipitation || "0",
      weather: element.Weather || "未知",
    };
  } catch (err) {
    console.log("目前天氣錯誤:", err.message);
    return null;
  }
}

/* =========================
   未來三天
   F-D0047-091
========================= */
async function getThreeDays() {
  try {
    const url = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-091?Authorization=${CWA_API_KEY}`;

    const res = await axios.get(url);

    // ✅ 第一層保護
    if (!res.data || !res.data.records || !res.data.records.locations) {
      console.log("API 回傳異常:", res.data);
      return [];
    }

    const locations = res.data.records.locations;

    if (!locations.length || !locations[0].location) {
      console.log("沒有 location 資料");
      return [];
    }

    const allLocations = locations[0].location;

    const target = allLocations.find(
      loc => loc.locationName === "礁溪鄉"
    );

    if (!target) {
      console.log("找不到礁溪鄉");
      return [];
    }

    const elements = target.weatherElement;

    const wx = elements.find(e => e.elementName === "Wx");
    const minT = elements.find(e => e.elementName === "MinT");
    const maxT = elements.find(e => e.elementName === "MaxT");
    const pop = elements.find(e => e.elementName === "PoP12h");

    if (!wx || !minT || !maxT || !pop) {
      console.log("天氣元素缺失");
      return [];
    }

    const result = [];

    for (let i = 0; i < 3; i++) {
      if (!wx.time[i]) break;

      result.push({
        date: wx.time[i].startTime.split(" ")[0],
        weather: wx.time[i].elementValue[0].value,
        min: minT.time[i].elementValue[0].value,
        max: maxT.time[i].elementValue[0].value,
        rain: pop.time[i].elementValue[0].value
      });
    }

    return result;

  } catch (err) {
    console.log("三天天氣錯誤:", err.message);
    return [];
  }
}

/* =========================
   組合訊息
========================= */
async function getWeatherMessage() {
  const now = new Date();
  const timeString = now.toLocaleString("zh-TW", { hour12: false });

  const current = await getCurrentWeather();
  const threeDays = await getThreeDays();

  let message = `📍 礁溪鄉\n`;
  message += `🕒 ${timeString}\n\n`;

  /* 目前天氣 */
  message += `📌 目前天氣\n`;

  if (current) {
    const emoji = getWeatherEmoji(current.weather);
    message += `${current.temp}°C ☔${current.rain}mm ${emoji}${current.weather}\n\n`;
  } else {
    message += `--°C --\n\n`;
  }

  /* 未來三天 */
  message += `📅 未來3天\n`;

  if (threeDays.length) {
    threeDays.forEach(day => {
      const emoji = getWeatherEmoji(day.weather);
      message += `${day.date} ${day.min}°~${day.max}° ☔${day.rain}% ${emoji}${day.weather}\n`;
    });
  } else {
    message += `暫無資料\n`;
  }

  message += `\n資料來源：中央氣象署`;

  return message;
}

/* =========================
   LINE Webhook
========================= */
app.post("/webhook", async (req, res) => {
  try {
    const events = req.body.events;

    for (let event of events) {
      if (event.type === "message" && event.message.type === "text") {
        const replyText = await getWeatherMessage();

        await client.replyMessage(event.replyToken, {
          type: "text",
          text: replyText,
        });
      }
    }

    res.status(200).send("OK");
  } catch (err) {
    console.log("Webhook錯誤:", err.message);
    res.status(500).end();
  }
});

/* =========================
   Server
========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
