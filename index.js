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

  const userMessage = event.message.text;
  
  if (userMessage.includes('天氣') || userMessage.includes('宜蘭')) {
    const weatherData = await getCurrentWeather();
    
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: weatherData
    });
  }
  
  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: '請輸入「天氣」或「宜蘭」來查詢天氣資訊'
  });
}

// 獲取未來5天的日期（格式：MM/DD）
function getFutureDates(days = 5) {
  const dates = [];
  const today = new Date();
  
  // 調整為台灣時間（UTC+8）
  const twTime = new Date(today.getTime() + (8 * 60 * 60 * 1000));
  
  for (let i = 1; i <= days; i++) {
    const futureDate = new Date(twTime.getTime() + (i * 24 * 60 * 60 * 1000));
    const month = String(futureDate.getMonth() + 1).padStart(2, '0');
    const day = String(futureDate.getDate()).padStart(2, '0');
    dates.push(`${month}/${day}`);
  }
  
  return dates;
}

// 生成2小時間隔的時間區間
function generate2HourSlots() {
  const slots = [];
  const now = new Date();
  
  const twTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  const currentHour = twTime.getHours();
  const currentMinute = twTime.getMinutes();
  
  console.log(`目前台灣時間: ${currentHour}:${currentMinute}`);
  
  let startHour = currentHour;
  if (currentMinute < 30) {
    startHour = currentHour + 1;
  } else {
    startHour = currentHour + 2;
  }
  
  for (let i = 0; i < 5; i++) {
    const slotStartHour = (startHour + (i * 2)) % 24;
    const slotEndHour = (slotStartHour + 2) % 24;
    
    const startTimeStr = `${String(slotStartHour).padStart(2, '0')}:00`;
    const endTimeStr = `${String(slotEndHour).padStart(2, '0')}:00`;
    
    let dayMark = "";
    if (slotStartHour < currentHour && i > 0) {
      dayMark = " (明日)";
    } else if (slotEndHour < slotStartHour) {
      dayMark = " (跨日)";
    }
    
    slots.push({
      start: startTimeStr,
      end: endTimeStr,
      dayMark: dayMark,
      startHour: slotStartHour
    });
  }
  
  return slots;
}

// 從 API 獲取未來5天預報
async function get7DayForecast() {
  try {
    console.log('開始取得7天的資料...');
    
    const response = await axios.get(
      `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-071?` +
      `Authorization=${CWA_API_KEY}&` +
      `locationName=宜蘭縣&` +
      `elementName=Wx,MinT,MaxT,PoP`
    );

    console.log('API 回應狀態:', response.data.success);
    
    // 嘗試多種可能的資料路徑
    let locations = null;
    let weatherData = null;
    
    // 路徑 1: records.locations
    if (response.data.records?.locations) {
      console.log('使用路徑: records.locations');
      locations = response.data.records.locations[0]?.location;
    }
    // 路徑 2: records.location
    else if (response.data.records?.location) {
      console.log('使用路徑: records.location');
      locations = response.data.records.location;
    }
    // 路徑 3: data.records.locations
    else if (response.data.data?.records?.locations) {
      console.log('使用路徑: data.records.locations');
      locations = response.data.data.records.locations[0]?.location;
    }
    // 路徑 4: result.records.locations
    else if (response.data.result?.records?.locations) {
      console.log('使用路徑: result.records.locations');
      locations = response.data.result.records.locations[0]?.location;
    }
    
    if (!locations || locations.length === 0) {
      console.log('找不到 locations 資料，完整回應:', JSON.stringify(response.data, null, 2).substring(0, 500));
      return "無法取得天氣資料";
    }

    const location = locations[0];
    console.log('地點名稱:', location.locationName);
    
    const weatherElements = location.weatherElement || [];
    console.log('天氣元素:', weatherElements.map(e => e.elementName));
    
    // 獲取各種天氣元素
    const wxData = weatherElements.find(e => e.elementName === "Wx")?.time || [];
    const minTData = weatherElements.find(e => e.elementName === "MinT")?.time || [];
    const maxTData = weatherElements.find(e => e.elementName === "MaxT")?.time || [];
    const popData = weatherElements.find(e => e.elementName === "PoP")?.time || [];

    console.log(`Wx 資料筆數: ${wxData.length}`);
    if (wxData.length > 0) {
      console.log('第一筆 Wx 開始時間:', wxData[0].startTime);
    }
    
    // 獲取未來5天的日期
    const futureDates = getFutureDates(5);
    console.log('目標未來日期:', futureDates);
    
    let weekForecast = [];
    
    // 對每個目標日期尋找對應的預報資料
    for (let i = 0; i < futureDates.length; i++) {
      const targetDate = futureDates[i];
      
      // 尋找對應日期的天氣資料
      let foundWx = null;
      let foundMinT = null;
      let foundMaxT = null;
      let foundPop = null;
      
      // 從 Wx 資料中找對應日期
      for (const item of wxData) {
        if (item.startTime) {
          const itemDate = item.startTime.substring(5, 10).replace('-', '/');
          if (itemDate === targetDate) {
            foundWx = item;
            break;
          }
        }
      }
      
      // 從 MinT 資料中找對應日期
      for (const item of minTData) {
        if (item.startTime) {
          const itemDate = item.startTime.substring(5, 10).replace('-', '/');
          if (itemDate === targetDate) {
            foundMinT = item;
            break;
          }
        }
      }
      
      // 從 MaxT 資料中找對應日期
      for (const item of maxTData) {
        if (item.startTime) {
          const itemDate = item.startTime.substring(5, 10).replace('-', '/');
          if (itemDate === targetDate) {
            foundMaxT = item;
            break;
          }
        }
      }
      
      // 從 PoP 資料中找對應日期
      for (const item of popData) {
        if (item.startTime) {
          const itemDate = item.startTime.substring(5, 10).replace('-', '/');
          if (itemDate === targetDate) {
            foundPop = item;
            break;
          }
        }
      }
      
      // 如果有找到任何資料，就加入預報
      if (foundWx || foundMinT || foundMaxT) {
        // 解析天氣描述
        let weather = "資料讀取中";
        if (foundWx?.elementValue) {
          if (Array.isArray(foundWx.elementValue)) {
            weather = foundWx.elementValue[0]?.value || "未知";
          }
        }
        
        // 解析最低溫
        let minTemp = "--";
        if (foundMinT?.elementValue) {
          if (Array.isArray(foundMinT.elementValue)) {
            minTemp = foundMinT.elementValue[0]?.value || "--";
          }
        }
        
        // 解析最高溫
        let maxTemp = "--";
        if (foundMaxT?.elementValue) {
          if (Array.isArray(foundMaxT.elementValue)) {
            maxTemp = foundMaxT.elementValue[0]?.value || "--";
          }
        }
        
        // 解析降雨機率
        let pop = "--";
        if (foundPop?.elementValue) {
          if (Array.isArray(foundPop.elementValue)) {
            pop = foundPop.elementValue[0]?.value || "--";
          }
        }
        
        weekForecast.push({
          date: targetDate,
          weather: weather,
          minTemp: minTemp,
          maxTemp: maxTemp,
          pop: pop
        });
        
        console.log(`找到 ${targetDate}: ${weather}, ${minTemp}~${maxTemp}, ${pop}%`);
      }
    }
    
    // 組合成文字
    if (weekForecast.length > 0) {
      let weekText = "";
      for (const day of weekForecast) {
        weekText += `${day.date} ${day.weather} ${day.maxTemp}°/${day.minTemp}° ☔${day.pop}%\n`;
      }
      return weekText;
    } else {
      // 如果沒有找到對應日期的資料，直接顯示 API 回傳的前5筆資料
      console.log('找不到對應日期的資料，顯示前5筆 Wx 資料');
      
      let weekText = "";
      for (let i = 0; i < Math.min(5, wxData.length); i++) {
        const item = wxData[i];
        if (item.startTime) {
          const displayDate = item.startTime.substring(5, 10).replace('-', '/');
          let weather = "未知";
          if (item.elementValue) {
            if (Array.isArray(item.elementValue)) {
              weather = item.elementValue[0]?.value || "未知";
            }
          }
          weekText += `${displayDate} ${weather}\n`;
        }
      }
      return weekText || "無法取得預報資料";
    }

  } catch (error) {
    console.log("7天預報錯誤：", error.message);
    return "API 呼叫失敗";
  }
}

async function getCurrentWeather() {
  try {
    console.log('開始取得36小時預報...');
    
    // ===== 36小時預報 =====
    const res36 = await axios.get(
      `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001?Authorization=${CWA_API_KEY}&locationName=宜蘭縣`
    );

    const location36 = res36.data.records.location[0];
    const elements36 = location36.weatherElement;

    const wx = elements36.find(e => e.elementName === "Wx").time;
    const pop = elements36.find(e => e.elementName === "PoP").time;
    const minT = elements36.find(e => e.elementName === "MinT").time;
    const maxT = elements36.find(e => e.elementName === "MaxT").time;
    
    const currentMinTemp = minT[0].parameter.parameterName;
    const currentMaxTemp = maxT[0].parameter.parameterName;
    const currentWeather = wx[0].parameter.parameterName;
    const currentPop = pop[0].parameter.parameterName;
    
    // 生成2小時間隔的時間區間
    const timeSlots = generate2HourSlots();
    
    // 獲取未來2小時間隔的天氣
    let twoHourText = "";
    for (let i = 0; i < timeSlots.length; i++) {
      const slot = timeSlots[i];
      
      // 使用對應的預報資料
      const forecastIndex = Math.min(i, wx.length - 1);
      const weather = wx[forecastIndex]?.parameter?.parameterName || "";
      const rain = pop[forecastIndex]?.parameter?.parameterName || "";
      const minTemp = minT[forecastIndex]?.parameter?.parameterName || "";
      const maxTemp = maxT[forecastIndex]?.parameter?.parameterName || "";
      
      let slotText = `${slot.start}-${slot.end}${slot.dayMark} ${weather}`;
      if (minTemp && maxTemp) {
        slotText += ` ${minTemp}°~${maxTemp}°`;
      }
      if (rain) {
        slotText += ` ☔${rain}%`;
      }
      twoHourText += slotText + '\n';
    }

    // ===== 從 API 獲取未來5天預報 =====
    console.log('開始取得7天的資料...');
    const weekForecast = await get7DayForecast();

    // 獲取今天的日期顯示
    const today = new Date();
    const twTime = new Date(today.getTime() + (8 * 60 * 60 * 1000));
    const todayStr = `${twTime.getFullYear()}/${String(twTime.getMonth() + 1).padStart(2, '0')}/${String(twTime.getDate()).padStart(2, '0')}`;
    const currentTimeStr = `${String(twTime.getHours()).padStart(2, '0')}:${String(twTime.getMinutes()).padStart(2, '0')}`;

    let result = `📍 宜蘭縣天氣總覽 (${todayStr} ${currentTimeStr})\n`;
    result += `━━━━━━━━━━━━\n\n`;
    
    result += `🌡 目前氣溫：${currentMinTemp}°C ~ ${currentMaxTemp}°C\n`;
    result += `☁️ 天氣：${currentWeather}\n`;
    result += `☔ 降雨機率：${currentPop}%\n\n`;
    
    result += `🕒 未來 10 小時逐2小時預報\n`;
    result += twoHourText + '\n';
    
    result += `📅 未來 5 天預報\n`;
    result += weekForecast + '\n';
    
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
