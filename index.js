const express = require('express');
const axios = require('axios');
const line = require('@line/bot-sdk');

const app = express();
const PORT = process.env.PORT || 3000;

// 從環境變數獲取 API 金鑰
const CWA_API_KEY = process.env.CWA_API_KEY;

// Line Bot 配置
const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

// 初始化 Line 客戶端
const client = new line.Client(lineConfig);

// 解析 Line 的 webhook 請求
app.post('/webhook', line.middleware(lineConfig), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// 處理 Line 事件
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  // 取得使用者輸入的文字
  const userMessage = event.message.text;
  
  // 檢查是否為查詢天氣的命令
  if (userMessage.includes('天氣') || userMessage.includes('宜蘭')) {
    const weatherData = await getCurrentWeather();
    
    // 回覆天氣資訊
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: weatherData
    });
  }
  
  // 預設回覆
  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: '請輸入「天氣」或「宜蘭」來查詢天氣資訊'
  });
}

async function getCurrentWeather() {
  try {
    // ===== 36小時預報 =====
    const res36 = await axios.get(
      `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001?Authorization=${CWA_API_KEY}&locationName=宜蘭縣`
    );

    const location36 = res36.data.records.location[0];
    const elements36 = location36.weatherElement;

    const wx = elements36.find(e => e.elementName === "Wx").time;
    const pop = elements36.find(e => e.elementName === "PoP").time;
    const minT = elements36.find(e => e.elementName === "MinT").time[0].parameter.parameterName;
    const maxT = elements36.find(e => e.elementName === "MaxT").time[0].parameter.parameterName;

    let sixHourText = "";
    for (let i = 0; i < 3; i++) {
      const start = wx[i].startTime.substring(11, 16);
      const end = wx[i].endTime.substring(11, 16);
      const weather = wx[i].parameter.parameterName;
      const rain = pop[i].parameter.parameterName;

      sixHourText += `${start}-${end} ${weather} ☔${rain}%\n`;
    }

    // ===== 7天預報 API =====
    const res7 = await axios.get(
      `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-003?Authorization=${CWA_API_KEY}&locationName=宜蘭縣`
    );

    if (!res7.data.records.locations) {
      return "⚠️ 7天預報 API 結構錯誤";
    }

    const locations = res7.data.records.locations[0].location;

    if (!locations || locations.length === 0) {
      return "⚠️ 找不到宜蘭縣資料";
    }

    const location7 = locations[0];
    const elements7 = location7.weatherElement;

    const wx7 = elements7.find(e => e.elementName === "Wx")?.time || [];
    const minT7 = elements7.find(e => e.elementName === "MinT")?.time || [];
    const maxT7 = elements7.find(e => e.elementName === "MaxT")?.time || [];

    let weekText = "";

    for (let i = 0; i < 5 && i < wx7.length; i++) {
      const date = wx7[i].startTime.substring(5, 10);
      const weather = wx7[i].elementValue[0].value;
      const minTemp = minT7[i]?.elementValue[0]?.value || "--";
      const maxTemp = maxT7[i]?.elementValue[0]?.value || "--";

      weekText += `${date} ${weather} ${maxTemp}°/${minTemp}°\n`;
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
    console.log("錯誤內容：", error.response?.data || error.message);
    return "⚠️ 無法取得天氣資料";
  }
}

// 測試用根路由
app.get('/', (req, res) => {
  res.send('Line Bot 天氣機器人已啟動！');
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`天氣機器人正在連接埠 ${PORT} 上運行`);
  console.log(`Webhook URL: https://line-bot-agjf.onrender.com/webhook`);
});

module.exports = app;
