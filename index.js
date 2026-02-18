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

    console.log('36小時預報 API 回應成功');

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
    // 嘗試不同的資料集 ID
    const datasetIds = ['F-D0047-003', 'F-D0047-005', 'F-D0047-007', 'F-D0047-001'];
    let res7 = null;
    let success = false;

    for (const datasetId of datasetIds) {
      try {
        console.log(`嘗試使用資料集: ${datasetId}`);
        const response = await axios.get(
          `https://opendata.cwa.gov.tw/api/v1/rest/datastore/${datasetId}?Authorization=${CWA_API_KEY}&locationName=宜蘭縣`
        );
        
        if (response.data.records && response.data.records.locations) {
          res7 = response;
          success = true;
          console.log(`成功使用資料集: ${datasetId}`);
          break;
        }
      } catch (e) {
        console.log(`資料集 ${datasetId} 失敗`);
      }
    }

    if (!success) {
      // 如果7天預報失敗，只回傳36小時預報
      return (
        `📍 宜蘭縣天氣總覽 (僅36小時預報)\n` +
        `━━━━━━━━━━━━\n\n` +
        `🌡 氣溫：${minT}°C ~ ${maxT}°C\n` +
        `☁️ 天氣：${wx[0].parameter.parameterName}\n` +
        `☔ 降雨機率：${pop[0].parameter.parameterName}%\n\n` +
        `🕒 未來 6 小時區間\n` +
        sixHourText +
        `\n📅 未來 5 天預報暫時無法取得\n` +
        `━━━━━━━━━━━━\n資料來源：中央氣象署`
      );
    }

    // 解析7天預報資料
    const locations = res7.data.records.locations[0].location;
    const location7 = locations[0];
    const elements7 = location7.weatherElement;

    // 記錄實際的資料結構
    console.log('7天預報 API 元素:', elements7.map(e => e.elementName));

    const wx7 = elements7.find(e => e.elementName === "Wx")?.time || [];
    const minT7 = elements7.find(e => e.elementName === "MinT")?.time || [];
    const maxT7 = elements7.find(e => e.elementName === "MaxT")?.time || [];

    let weekText = "";

    for (let i = 0; i < 5 && i < wx7.length; i++) {
      const date = wx7[i].startTime.substring(5, 10);
      
      // 處理不同的資料格式
      let weather = "--";
      if (wx7[i].elementValue) {
        if (Array.isArray(wx7[i].elementValue)) {
          weather = wx7[i].elementValue[0]?.value || "--";
        } else if (wx7[i].elementValue.value) {
          weather = wx7[i].elementValue.value;
        }
      } else if (wx7[i].value) {
        weather = wx7[i].value;
      } else if (wx7[i].parameter) {
        weather = wx7[i].parameter.parameterName || "--";
      }

      let minTemp = "--";
      if (minT7[i]?.elementValue) {
        if (Array.isArray(minT7[i].elementValue)) {
          minTemp = minT7[i].elementValue[0]?.value || "--";
        } else if (minT7[i].elementValue.value) {
          minTemp = minT7[i].elementValue.value;
        }
      } else if (minT7[i]?.value) {
        minTemp = minT7[i].value;
      }

      let maxTemp = "--";
      if (maxT7[i]?.elementValue) {
        if (Array.isArray(maxT7[i].elementValue)) {
          maxTemp = maxT7[i].elementValue[0]?.value || "--";
        } else if (maxT7[i].elementValue.value) {
          maxTemp = maxT7[i].elementValue.value;
        }
      } else if (maxT7[i]?.value) {
        maxTemp = maxT7[i].value;
      }

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
