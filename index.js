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

// 獲取 7 天預報的函數
async function get7DayForecast() {
  try {
    // 使用正確的資料集 ID - 鄉鎮天氣預報
    const response = await axios.get(
      `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-071?Authorization=${CWA_API_KEY}&locationName=宜蘭縣`
    );

    console.log('7天預報 API 完整回應:', JSON.stringify(response.data, null, 2).substring(0, 500));

    // 檢查資料結構
    if (!response.data.records || !response.data.records.locations) {
      console.log('找不到 records.locations');
      return null;
    }

    const locations = response.data.records.locations[0]?.location;
    if (!locations || locations.length === 0) {
      console.log('找不到 location 資料');
      return null;
    }

    const location = locations[0];
    console.log('地點:', location.locationName);

    const weatherElements = location.weatherElement || [];
    
    // 找出需要的天氣元素
    const wxData = weatherElements.find(e => e.elementName === "Wx")?.time || [];
    const tempData = weatherElements.find(e => e.elementName === "T")?.time || [];
    const minTData = weatherElements.find(e => e.elementName === "MinT")?.time || [];
    const maxTData = weatherElements.find(e => e.elementName === "MaxT")?.time || [];
    const popData = weatherElements.find(e => e.elementName === "PoP")?.time || [];

    console.log(`找到天氣資料: Wx=${wxData.length}, Temp=${tempData.length}, MinT=${minTData.length}, MaxT=${maxTData.length}, PoP=${popData.length}`);

    // 如果沒有找到任何資料，返回 null
    if (wxData.length === 0) {
      console.log('找不到天氣描述資料');
      return null;
    }

    let weekText = "";
    const daysToShow = Math.min(5, wxData.length);

    for (let i = 0; i < daysToShow; i++) {
      // 解析日期
      const startTime = wxData[i]?.startTime || wxData[i]?.dataTime;
      if (!startTime) continue;
      
      const date = startTime.substring(5, 10).replace('-', '/');
      
      // 獲取天氣描述 - 處理不同的資料格式
      let weather = "--";
      if (wxData[i]?.elementValue) {
        if (Array.isArray(wxData[i].elementValue)) {
          weather = wxData[i].elementValue[0]?.value || 
                   wxData[i].elementValue[0]?.measure || 
                   "--";
        } else if (wxData[i].elementValue.value) {
          weather = wxData[i].elementValue.value;
        }
      } else if (wxData[i]?.value) {
        weather = wxData[i].value;
      }

      // 獲取溫度 - 優先使用 MinT/MaxT，如果沒有則使用 T
      let minTemp = "--";
      let maxTemp = "--";

      // 嘗試從 MinT 獲取
      if (minTData[i]?.elementValue) {
        if (Array.isArray(minTData[i].elementValue)) {
          minTemp = minTData[i].elementValue[0]?.value || "--";
        }
      }

      // 嘗試從 MaxT 獲取
      if (maxTData[i]?.elementValue) {
        if (Array.isArray(maxTData[i].elementValue)) {
          maxTemp = maxTData[i].elementValue[0]?.value || "--";
        }
      }

      // 如果沒有 MinT/MaxT，嘗試從 T 獲取
      if (minTemp === "--" && tempData[i * 2]) {
        if (Array.isArray(tempData[i * 2]?.elementValue)) {
          minTemp = tempData[i * 2].elementValue[0]?.value || "--";
        }
      }
      if (maxTemp === "--" && tempData[i * 2 + 1]) {
        if (Array.isArray(tempData[i * 2 + 1]?.elementValue)) {
          maxTemp = tempData[i * 2 + 1].elementValue[0]?.value || "--";
        }
      }

      // 獲取降雨機率
      let pop = "--";
      if (popData[i]?.elementValue) {
        if (Array.isArray(popData[i].elementValue)) {
          pop = popData[i].elementValue[0]?.value || "--";
        }
      }

      weekText += `${date} ${weather} ${maxTemp}°/${minTemp}° ☔${pop}%\n`;
    }

    return weekText;

  } catch (error) {
    console.log("7天預報錯誤：", error.message);
    if (error.response) {
      console.log("回應狀態：", error.response.status);
      console.log("回應資料：", error.response.data);
    }
    return null;
  }
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

    // ===== 嘗試獲取7天預報 =====
    const weekForecast = await get7DayForecast();

    let result = `📍 宜蘭縣天氣總覽\n━━━━━━━━━━━━\n\n` +
                 `🌡 氣溫：${minT}°C ~ ${maxT}°C\n` +
                 `☁️ 天氣：${wx[0].parameter.parameterName}\n` +
                 `☔ 降雨機率：${pop[0].parameter.parameterName}%\n\n` +
                 `🕒 未來 6 小時區間\n${sixHourText}\n`;

    if (weekForecast) {
      result += `\n📅 未來 5 天\n${weekForecast}`;
    } else {
      result += `\n📅 未來 5 天預報暫時無法取得\n`;
    }

    result += `━━━━━━━━━━━━\n資料來源：中央氣象署`;

    return result;

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
