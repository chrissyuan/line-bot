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

// 計算溫度平均值
function calculateAverageTemp(min, max) {
  if (min && max && min !== '--' && max !== '--') {
    const avg = (parseFloat(min) + parseFloat(max)) / 2;
    return Math.round(avg * 10) / 10; // 四捨五入到小數點第一位
  }
  return null;
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
    const response = await axios.get(
      `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-071?` +
      `Authorization=${CWA_API_KEY}&` +
      `locationName=宜蘭縣&` +
      `elementName=Wx,MinT,MaxT,PoP`
    );

    if (!response.data.records || !response.data.records.Locations) {
      return "";
    }
    
    const locationsList = response.data.records.Locations;
    if (!locationsList || locationsList.length === 0) {
      return "";
    }
    
    const firstLocations = locationsList[0];
    const locationArray = firstLocations.Location;
    if (!locationArray || locationArray.length === 0) {
      return "";
    }
    
    const yilanData = locationArray.find(loc => loc.LocationName === '宜蘭縣');
    if (!yilanData) {
      return "";
    }
    
    const weatherElements = yilanData.WeatherElement || [];
    
    const wxData = weatherElements.find(e => e.ElementName === 'Wx')?.Time || [];
    const minTData = weatherElements.find(e => e.ElementName === 'MinT')?.Time || [];
    const maxTData = weatherElements.find(e => e.ElementName === 'MaxT')?.Time || [];
    const popData = weatherElements.find(e => e.ElementName === 'PoP')?.Time || [];
    
    const futureDates = getFutureDates(5);
    
    let weekForecast = [];
    
    for (let i = 0; i < futureDates.length; i++) {
      const targetDate = futureDates[i];
      
      const wx = wxData.find(item => {
        const startTime = item.StartTime || item.DataTime;
        return startTime && startTime.substring(5, 10).replace('-', '/') === targetDate;
      });
      
      const minT = minTData.find(item => {
        const startTime = item.StartTime || item.DataTime;
        return startTime && startTime.substring(5, 10).replace('-', '/') === targetDate;
      });
      
      const maxT = maxTData.find(item => {
        const startTime = item.StartTime || item.DataTime;
        return startTime && startTime.substring(5, 10).replace('-', '/') === targetDate;
      });
      
      const pop = popData.find(item => {
        const startTime = item.StartTime || item.DataTime;
        return startTime && startTime.substring(5, 10).replace('-', '/') === targetDate;
      });
      
      if (wx || minT || maxT) {
        const minTemp = minT?.ElementValue?.[0]?.Value;
        const maxTemp = maxT?.ElementValue?.[0]?.Value;
        const avgTemp = calculateAverageTemp(minTemp, maxTemp);
        const rain = pop?.ElementValue?.[0]?.Value;
        
        weekForecast.push({
          date: targetDate,
          avgTemp: avgTemp,
          pop: rain
        });
      }
    }
    
    if (weekForecast.length > 0) {
      let weekText = "";
      for (const day of weekForecast) {
        weekText += `${day.date} `;
        if (day.avgTemp !== null) {
          weekText += `${day.avgTemp}°`;
        }
        if (day.pop && day.pop !== '--') {
          weekText += ` ☔${day.pop}%`;
        }
        weekText += '\n';
      }
      return weekText;
    }
    
    return "";

  } catch (error) {
    console.log("7天預報錯誤：", error.message);
    return "";
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
    const minT = elements36.find(e => e.elementName === "MinT").time;
    const maxT = elements36.find(e => e.elementName === "MaxT").time;
    
    // 計算目前氣溫平均值
    const currentMinTemp = parseFloat(minT[0].parameter.parameterName);
    const currentMaxTemp = parseFloat(maxT[0].parameter.parameterName);
    const currentAvgTemp = Math.round(((currentMinTemp + currentMaxTemp) / 2) * 10) / 10;
    
    // 目前降雨機率
    const currentPop = pop[0].parameter.parameterName;
    
    // 生成2小時間隔的時間區間
    const timeSlots = generate2HourSlots();
    
    // 獲取未來2小時間隔的溫度平均值和降雨機率
    let twoHourText = "";
    for (let i = 0; i < timeSlots.length; i++) {
      const slot = timeSlots[i];
      
      // 使用對應的預報資料
      const forecastIndex = Math.min(i, wx.length - 1);
      const rain = pop[forecastIndex]?.parameter?.parameterName;
      const minTemp = parseFloat(minT[forecastIndex]?.parameter?.parameterName);
      const maxTemp = parseFloat(maxT[forecastIndex]?.parameter?.parameterName);
      
      // 計算平均溫度
      let avgTemp = null;
      if (!isNaN(minTemp) && !isNaN(maxTemp)) {
        avgTemp = Math.round(((minTemp + maxTemp) / 2) * 10) / 10;
      }
      
      let slotText = `${slot.start}-${slot.end}${slot.dayMark} `;
      if (avgTemp !== null) {
        slotText += `${avgTemp}°`;
      }
      if (rain && rain !== '--') {
        slotText += ` ☔${rain}%`;
      }
      twoHourText += slotText + '\n';
    }

    // ===== 從 API 獲取未來5天預報 =====
    const weekForecast = await get7DayForecast();

    // 獲取今天的日期顯示
    const today = new Date();
    const twTime = new Date(today.getTime() + (8 * 60 * 60 * 1000));
    const todayStr = `${twTime.getFullYear()}/${String(twTime.getMonth() + 1).padStart(2, '0')}/${String(twTime.getDate()).padStart(2, '0')}`;
    const currentTimeStr = `${String(twTime.getHours()).padStart(2, '0')}:${String(twTime.getMinutes()).padStart(2, '0')}`;

    let result = `📍 宜蘭縣 (${todayStr} ${currentTimeStr})\n`;
    result += `━━━━━━━━━━━━\n\n`;
    
    // 目前氣溫（平均值）
    if (!isNaN(currentAvgTemp)) {
      result += `🌡 目前 ${currentAvgTemp}°`;
      if (currentPop && currentPop !== '--') {
        result += `  ☔${currentPop}%`;
      }
      result += '\n';
    }
    
    if (twoHourText) {
      result += `\n🕒 未來10小時\n`;
      result += twoHourText;
    }
    
    if (weekForecast) {
      result += `\n📅 未來5天\n`;
      result += weekForecast;
    }
    
    result += `\n━━━━━━━━━━━━\n資料來源：中央氣象署`;

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
