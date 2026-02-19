const express = require("express");
const axios = require("axios");
const crypto = require("crypto");

const app = express();
app.use(express.json());

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
const CWA_API_KEY = process.env.CWA_API_KEY;

// ===== LINE 簽章驗證 =====
function verifyLineSignature(req) {
  const signature = req.headers["x-line-signature"];
  const body = JSON.stringify(req.body);

  const hash = crypto
    .createHmac("sha256", LINE_CHANNEL_SECRET)
    .update(body)
    .digest("base64");

  return hash === signature;
}

// ===== 取得天氣 =====
async function getWeather36hr(locationName) {
  try {
    const url = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001?Authorization=${CWA_API_KEY}&locationName=${encodeURIComponent(locationName)}`;

    const res = await axios.get(url);
    const location = res.data.records.location[0];

    const wx = location.weatherElement.find(e => e.elementName === "Wx").time;
    const pop = location.weatherElement.find(e => e.elementName === "PoP").time;
    const minT = location.weatherElement.find(e => e.elementName === "MinT").time;
    const maxT = location.weatherElement.find(e => e.elementName === "MaxT").time;

    const now = new Date();
    const nowStr = now.toLocaleString("zh-TW", { hour12: false });

    // ========= 找目前時段 =========
    let currentIndex = wx.findIndex(t => {
      const start = new Date(t.startTime);
      const end = new Date(t.endTime);
      return now >= start && now < end;
    });

    if (currentIndex === -1) currentIndex = 0;

    const currentTemp = Math.round(
      (parseInt(minT[currentIndex].parameter.parameterName) +
       parseInt(maxT[currentIndex].parameter.parameterName)) / 2
    );

    const currentRain = pop[currentIndex].parameter.parameterName;
    const currentWeather = wx[currentIndex].parameter.parameterName;

    // ========= 未來 3 個逐 3 小時 =========
    let futureText = "";

    for (let i = currentIndex + 1; i <= currentIndex + 3 && i < wx.length; i++) {

      const start = new Date(wx[i].startTime);
      const end = new Date(wx[i].endTime);

      const timeStr =
        start.getHours().toString().padStart(2, "0") + ":00-" +
        end.getHours().toString().padStart(2, "0") + ":00";

      const temp = Math.round(
        (parseInt(minT[i].parameter.parameterName) +
         parseInt(maxT[i].parameter.parameterName)) / 2
      );

      const rain = pop[i].parameter.parameterName;
      const weather = wx[i].parameter.parameterName;

      futureText += `${timeStr} ${getWeatherEmoji(weather)} ${temp}°C ☔${rain}% ${weather}\n`;
    }

    // ========= 未來5天 =========
    const fiveDayData = await getFiveDayWeather(locationName);

    return `🕒 ${nowStr}

📌 目前天氣
${getWeatherEmoji(currentWeather)} ${currentTemp}°C ☔${currentRain}% ${currentWeather}

📈 未來9小時 (逐3小時)
${futureText}

📅 未來5天預報
${fiveDayData}

資料來源：中央氣象署`;

  } catch (error) {
    console.log("錯誤:", error.message);
    return "⚠️ 無法取得天氣資料";
  }
}


// ===== LINE Webhook =====
app.post("/webhook", async (req, res) => {

  if (!verifyLineSignature(req)) {
    return res.status(403).send("Invalid signature");
  }

  const events = req.body.events;

  for (let event of events) {
    if (event.type === "message" && event.message.type === "text") {

      const weatherText = await getWeather();

      await axios.post(
        "https://api.line.me/v2/bot/message/reply",
        {
          replyToken: event.replyToken,
          messages: [{ type: "text", text: weatherText }]
        },
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
          }
        }
      );
    }
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`天氣機器人正在連接埠 ${PORT} 上運行`);
});
