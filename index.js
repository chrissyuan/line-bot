const express = require("express");
const axios = require("axios");
const crypto = require("crypto");

const app = express();
app.use(express.json());

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
const CWA_API_KEY = process.env.CWA_API_KEY;

// ===== 防止崩潰 =====
process.on("uncaughtException", err => console.error(err));
process.on("unhandledRejection", err => console.error(err));

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
async function getWeather() {
  try {

    // ===== 36小時 API =====
    const res36 = await axios.get(
      `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001?Authorization=${CWA_API_KEY}&locationName=宜蘭縣`
    );

    const location36 = res36.data.records.location[0];
    const elements36 = location36.weatherElement;

    const wx = elements36.find(e => e.elementName === "Wx").time;
    const pop = elements36.find(e => e.elementName === "PoP").time;
    const minT = elements36.find(e => e.elementName === "MinT").time;
    const maxT = elements36.find(e => e.elementName === "MaxT").time;

    // ===== 現在時間 =====
    const now = new Date();
    const nowStr = now.getFullYear() + "/" +
      String(now.getMonth()+1).padStart(2,"0") + "/" +
      String(now.getDate()).padStart(2,"0") + " " +
      String(now.getHours()).padStart(2,"0") + ":" +
      String(now.getMinutes()).padStart(2,"0");

    // 找目前落在哪個區間
    const currentIndex = wx.findIndex(t => {
      const start = new Date(t.startTime);
      const end = new Date(t.endTime);
      return now >= start && now < end;
    });

    const currentWeather = wx[currentIndex].parameter.parameterName;
    const currentRain = pop[currentIndex].parameter.parameterName;
    const currentMin = minT[currentIndex].parameter.parameterName;
    const currentMax = maxT[currentIndex].parameter.parameterName;

    // ===== 未來10小時 每2小時 =====
    let forecast10 = "";
    let currentTime = new Date(now);
    const endTime = new Date(now.getTime() + 10 * 60 * 60 * 1000);

    while (currentTime < endTime) {

      const nextTime = new Date(currentTime.getTime() + 2 * 60 * 60 * 1000);

      const index = wx.findIndex(t => {
        const start = new Date(t.startTime);
        const end = new Date(t.endTime);
        return currentTime >= start && currentTime < end;
      });

      if (index !== -1) {
        const weather = wx[index].parameter.parameterName;
        const rain = pop[index].parameter.parameterName;
        const minTemp = minT[index].parameter.parameterName;
        const maxTemp = maxT[index].parameter.parameterName;

        const startStr = String(currentTime.getHours()).padStart(2,"0") + ":00";
        const endStr = String(nextTime.getHours()).padStart(2,"0") + ":00";

        forecast10 += `${startStr}-${endStr} ${weather} ${minTemp}°~${maxTemp}° ☔${rain}%\n`;
      }

      currentTime = nextTime;
    }

    // ===== 5天預報 =====
    const res7 = await axios.get(
      `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-003?Authorization=${CWA_API_KEY}&locationName=宜蘭縣`
    );

    const locations = res7.data.records?.locations?.[0]?.location;
    let forecast5 = "";

    if (locations && locations.length > 0) {
      const elements7 = locations[0].weatherElement;

      const wx7 = elements7.find(e => e.elementName === "Wx")?.time || [];
      const minT7 = elements7.find(e => e.elementName === "MinT")?.time || [];
      const maxT7 = elements7.find(e => e.elementName === "MaxT")?.time || [];

      for (let i = 0; i < 5 && i < wx7.length; i++) {
        const date = wx7[i].startTime.substring(5,10);
        const weather = wx7[i].elementValue[0].value;
        const minTemp = minT7[i].elementValue[0].value;
        const maxTemp = maxT7[i].elementValue[0].value;

        forecast5 += `${date} ${weather} ${minTemp}°~${maxTemp}°\n`;
      }
    }

    // ===== 組合輸出 =====
    return (
`📍 宜蘭縣天氣總覽 (${nowStr})
━━━━━━━━━━━━

🌡 目前氣溫：${currentMin}°C ~ ${currentMax}°C
☁️ 天氣：${currentWeather}
☔ 降雨機率：${currentRain}%

🕒 未來 10 小時逐2小時預報
${forecast10}
📅 未來 5 天預報
${forecast5}
━━━━━━━━━━━━
資料來源：中央氣象署`
    );

  } catch (error) {
    console.error(error.response?.data || error.message);
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

// ===== Render PORT =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`天氣機器人正在連接埠 ${PORT} 上運行`);
});
