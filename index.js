const express = require("express");
const axios = require("axios");
const line = require("@line/bot-sdk");

const app = express();
const PORT = process.env.PORT || 3000;

const CWA_API_KEY = process.env.CWA_API_KEY;

const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new line.Client(lineConfig);

app.post("/webhook", line.middleware(lineConfig), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then(result => res.json(result))
    .catch(err => {
      console.error("Webhook錯誤:", err);
      res.status(200).end();
    });
});

async function handleEvent(event) {
  if (event.type !== "message" || event.message.type !== "text") {
    return Promise.resolve(null);
  }

  const text = event.message.text.trim();

  if (text.includes("天氣") || text.includes("宜蘭")) {
    const weather = await getWeather();
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: weather
    });
  }

  return client.replyMessage(event.replyToken, {
    type: "text",
    text: "請輸入「天氣」查詢礁溪天氣"
  });
}

/* ===========================
   主天氣功能
=========================== */
async function getWeather() {
  try {
    const now = new Date();
    const twTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);

    const timeStr =
      `${twTime.getFullYear()}/` +
      `${String(twTime.getMonth() + 1).padStart(2, "0")}/` +
      `${String(twTime.getDate()).padStart(2, "0")} ` +
      `${String(twTime.getHours()).padStart(2, "0")}:` +
      `${String(twTime.getMinutes()).padStart(2, "0")}`;

    const current = await getCurrentObservation();
    const radar = await checkRadarRain();
    const forecast = await getThreeDayForecast();

    return `📍 礁溪鄉
🕒 ${timeStr}

📌 目前天氣
${current}

${radar}

📅 未來3天
${forecast}

資料來源：中央氣象署`;

  } catch (err) {
    console.log("主錯誤:", err.message);
    return "⚠️ 無法取得天氣資料";
  }
}

/* ===========================
   即時觀測（比36hr準）
=========================== */
async function getCurrentObservation() {
  try {
    const res = await axios.get(
      `https://opendata.cwa.gov.tw/api/v1/rest/datastore/O-A0003-001?Authorization=${CWA_API_KEY}&StationName=礁溪`
    );

    const station = res.data.records.Station[0];

    const temp = station.WeatherElement.AirTemperature;
    const weather = station.WeatherElement.Weather;
    const rain = station.WeatherElement.Now.Precipitation || 0;

    return `${getEmoji(weather)} ${temp}°C ☔${rain}mm ${weather}`;

  } catch (err) {
    console.log("觀測錯誤:", err.message);
    return "--°C --";
  }
}

/* ===========================
   雷達回波判斷
=========================== */
async function checkRadarRain() {
  try {
    const res = await axios.get(
      `https://opendata.cwa.gov.tw/api/v1/rest/datastore/O-A0059-001?Authorization=${CWA_API_KEY}`
    );

    const reflectivity = res.data.records.content[0].Reflectivity;

    if (reflectivity > 35) return "⛈️ 強降雨中";
    if (reflectivity > 10) return "🌧️ 附近有降雨回波";

    return "🌤️ 雷達顯示無明顯降雨";

  } catch (err) {
    console.log("雷達錯誤:", err.message);
    return "";
  }
}

/* ===========================
   未來3天（F-D0047-091 鄉鎮級）
=========================== */
async function getThreeDayForecast() {
  try {
    const res = await axios.get(
      `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-091?Authorization=${CWA_API_KEY}&locationName=礁溪鄉`
    );

    const location = res.data.records.locations[0].location[0];

    const wx = location.weatherElement.find(e => e.elementName === "Wx").time;
    const pop = location.weatherElement.find(e => e.elementName === "PoP12h").time;
    const minT = location.weatherElement.find(e => e.elementName === "MinT").time;
    const maxT = location.weatherElement.find(e => e.elementName === "MaxT").time;

    let result = "";

    for (let i = 0; i < 6; i += 2) {
      const date = new Date(wx[i].startTime);

      const dateStr =
        `${String(date.getMonth() + 1).padStart(2, "0")}/` +
        `${String(date.getDate()).padStart(2, "0")}`;

      const weather = wx[i].elementValue[0].value;
      const rain = pop[i].elementValue[0].value;
      const minTemp = minT[i].elementValue[0].value;
      const maxTemp = maxT[i].elementValue[0].value;

      result += `${dateStr} ${getEmoji(weather)} ${minTemp}~${maxTemp}°C ☔${rain}% ${weather}\n`;
    }

    return result;

  } catch (err) {
    console.log("三天錯誤:", err.message);
    return "";
  }
}

/* ===========================
   天氣 Emoji
=========================== */
function getEmoji(weather) {
  if (!weather) return "🌤️";
  if (weather.includes("雷")) return "⛈️";
  if (weather.includes("雨")) return "🌧️";
  if (weather.includes("雲")) return "☁️";
  if (weather.includes("晴")) return "☀️";
  return "🌤️";
}

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});

module.exports = app;
