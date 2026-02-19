const express = require("express");
const axios = require("axios");
const crypto = require("crypto");

const app = express();
app.use(express.json());

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
const CWA_API_KEY = process.env.CWA_API_KEY;

// ===== 防止崩潰 =====
process.on("uncaughtException", err => {
  console.error("未捕捉錯誤:", err);
});

process.on("unhandledRejection", err => {
  console.error("Promise錯誤:", err);
});

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
    const res = await axios.get(
      `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001?Authorization=${CWA_API_KEY}&locationName=宜蘭縣`
    );

    const location = res.data.records.location[0];
    const elements = location.weatherElement;

    const wx = elements.find(e => e.elementName === "Wx").time;
    const pop = elements.find(e => e.elementName === "PoP").time;
    const minT = elements.find(e => e.elementName === "MinT").time;
    const maxT = elements.find(e => e.elementName === "MaxT").time;

    const now = new Date();
    const endTime = new Date(now.getTime() + 10 * 60 * 60 * 1000);

    let output = `📍 宜蘭縣未來10小時天氣\n`;
    output += `━━━━━━━━━━━━\n\n`;

    let currentTime = new Date(now);

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

        const startStr = currentTime.toTimeString().substring(0,5);
        const endStr = nextTime.toTimeString().substring(0,5);

        output += `${startStr}-${endStr}\n`;
        output += `${weather}\n`;
        output += `${minTemp}°C ~ ${maxTemp}°C\n`;
        output += `降雨率 ${rain}%\n\n`;
      }

      currentTime = nextTime;
    }

    output += `━━━━━━━━━━━━\n資料來源：中央氣象署`;

    return output;

  } catch (error) {
    console.error(error.response?.data || error.message);
    return "⚠️ 無法取得天氣資料";
  }
}

// ===== LINE Webhook =====
app.post("/webhook", async (req, res) => {
  try {

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
            messages: [
              { type: "text", text: weatherText }
            ]
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

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.sendStatus(500);
  }
});

// ===== 首頁測試 =====
app.get("/", (req, res) => {
  res.send("LINE 天氣機器人運行中");
});

// ===== Render PORT =====
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`天氣機器人正在連接埠 ${PORT} 上運行`);
});
