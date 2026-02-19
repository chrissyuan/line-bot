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

// 從 F-D0047-073 API 獲取2小時間隔的預報
async function get2HourForecast() {
  try {
    console.log('開始取得2小時間隔預報...');
    
    const response = await axios.get(
      `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-073?` +
      `Authorization=${CWA_API_KEY}&` +
      `locationName=宜蘭縣&` +
      `elementName=Wx,MinT,MaxT,PoP`
    );

    console.log('2小時預報 API 回應狀態:', response.data.success);
    
    // 根據 F-D0047-071 的經驗，結構應該是 records.Locations
    if (!response.data.records || !response.data.records.Locations) {
      console.log('找不到 records.Locations');
      return null;
    }
    
    const locationsList = response.data.records.Locations;
    if (!locationsList || locationsList.length === 0) {
      console.log('Locations 陣列為空');
      return null;
    }
    
    const firstLocations = locationsList[0];
    const locationArray = firstLocations.Location;
    if (!locationArray || locationArray.length === 0) {
      console.log('找不到 Location 陣列');
      return null;
    }
    
    const yilanData = locationArray.find(loc => loc.LocationName === '宜蘭縣');
    if (!yilanData) {
      console.log('找不到宜蘭縣資料');
      return null;
    }
    
    const weatherElements = yilanData.WeatherElement || [];
    
    // 取得各種天氣元素的時間資料
    const wxData = weatherElements.find(e => e.ElementName === 'Wx')?.Time || [];
    const minTData = weatherElements.find(e => e.ElementName === 'MinT')?.Time || [];
    const maxTData = weatherElements.find(e => e.ElementName === 'MaxT')?.Time || [];
    const popData = weatherElements.find(e => e.ElementName === 'PoP')?.Time || [];
    
    console.log(`找到2小時資料: Wx=${wxData.length}, MinT=${minTData.length}, MaxT=${maxTData.length}, PoP=${popData.length}`);
    
    // 獲取當前時間
    const now = new Date();
    const twTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    const currentHour = twTime.getHours();
    const currentMinute = twTime.getMinutes();
    
    // 決定要顯示的起始時間（下一個整點或下兩個整點）
    let startHour = currentHour;
    if (currentMinute < 30) {
      startHour = currentHour + 1;
    } else {
      startHour = currentHour + 2;
    }
    
    // 找出從 startHour 開始的5個時段
    let twoHourText = "";
    let foundCount = 0;
    
    for (let i = 0; i < wxData.length && foundCount < 5; i++) {
      const item = wxData[i];
      const startTime = item.StartTime || item.DataTime;
      
      if (startTime) {
        // 解析開始時間的小時
        const itemHour = parseInt(startTime.substring(11, 13));
        const itemDate = startTime.substring(5, 10).replace('-', '/');
        const todayDate = `${String(twTime.getMonth() + 1).padStart(2, '0')}/${String(twTime.getDate()).padStart(2, '0')}`;
        
        // 檢查是否為今天或明天的資料，且時間符合需求
        const isToday = itemDate === todayDate;
        const isFuture = (isToday && itemHour >= startHour) || 
                        (!isToday && foundCount > 0);
        
        if (isFuture) {
          // 計算結束時間
          const endHour = (itemHour + 2) % 24;
          const startTimeStr = `${String(itemHour).padStart(2, '0')}:00`;
          const endTimeStr = `${String(endHour).padStart(2, '0')}:00`;
          
          // 判斷是否跨日或明日
          let dayMark = "";
          if (!isToday) {
            dayMark = " (明日)";
          } else if (endHour < itemHour) {
            dayMark = " (跨日)";
          }
          
          // 找到對應的溫度和降雨資料
          const minT = minTData[i]?.ElementValue?.[0]?.Value;
          const maxT = maxTData[i]?.ElementValue?.[0]?.Value;
          const pop = popData[i]?.ElementValue?.[0]?.Value;
          
          // 計算平均溫度
          let avgTemp = null;
          if (minT && maxT) {
            avgTemp = calculateAverageTemp(minT, maxT);
          }
          
          let slotText = `${startTimeStr}-${endTimeStr}${dayMark} `;
          if (avgTemp !== null) {
            slotText += `溫度 ${avgTemp}°`;
          }
          if (pop && pop !== '--') {
            slotText += ` ☔${pop}%`;
          }
          twoHourText += slotText + '\n';
          foundCount++;
        }
      }
    }
    
    return twoHourText;

  } catch (error) {
    console.log("2小時預報錯誤：", error.message);
    return null;
  }
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
        // 解析天氣描述
        let weather = "";
        if (wx?.ElementValue) {
          if (Array.isArray(wx.ElementValue)) {
            weather = wx.ElementValue[0]?.Value || "";
          }
        }
        
        const minTemp = minT?.ElementValue?.[0]?.Value;
        const maxTemp = maxT?.ElementValue?.[0]?.Value;
        const rain = pop?.ElementValue?.[0]?.Value;
        
        weekForecast.push({
          date: targetDate,
          weather: weather,
          minTemp: minTemp,
          maxTemp: maxTemp,
          pop: rain
        });
      }
    }
    
    if (weekForecast.length > 0) {
      let weekText = "";
      for (const day of weekForecast) {
        weekText += `${day.date} ${day.weather} ${day.minTemp}°~${day.maxTemp}°`;
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
    // ===== 36小時預報（用於目前天氣）=====
    const res36 = await axios.get(
      `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001?Authorization=${CWA_API_KEY}&locationName=宜蘭縣`
    );

    const location36 = res36.data.records.location[0];
    const elements36 = location36.weatherElement;

    const wx = elements36.find(e => e.elementName === "Wx").time;
    const pop = elements36.find(e => e.elementName === "PoP").time;
    const minT = elements36.find(e => e.elementName === "MinT").time;
    const maxT = elements36.find(e => e.elementName === "MaxT").time;
    
    // 目前天氣資訊（使用第一筆資料）
    const currentWeather = wx[0].parameter.parameterName;
    const currentMinTemp = minT[0].parameter.parameterName;
    const currentMaxTemp = maxT[0].parameter.parameterName;
    const currentPop = pop[0].parameter.parameterName;
    
    // ===== 從 F-D0047-073 獲取真正的2小時間隔預報 =====
    const twoHourForecast = await get2HourForecast();

    // ===== 從 F-D0047-071 獲取未來5天預報 =====
    const weekForecast = await get7DayForecast();

    // 獲取今天的日期顯示
    const today = new Date();
    const twTime = new Date(today.getTime() + (8 * 60 * 60 * 1000));
    const todayStr = `${twTime.getFullYear()}/${String(twTime.getMonth() + 1).padStart(2, '0')}/${String(twTime.getDate()).padStart(2, '0')}`;
    const currentTimeStr = `${String(twTime.getHours()).padStart(2, '0')}:${String(twTime.getMinutes()).padStart(2, '0')}`;

    let result = `📍 宜蘭縣 (${todayStr} ${currentTimeStr})\n`;
    result += `━━━━━━━━━━━━\n\n`;
    
    // 目前天氣資訊
    result += `🌡 目前氣溫：${currentMinTemp}°C ~ ${currentMaxTemp}°C\n`;
    result += `☁️ 天氣：${currentWeather}\n`;
    result += `☔ 降雨機率：${currentPop}%\n`;
    
    if (twoHourForecast) {
      result += `\n🕒 未來10小時（2小時間隔）\n`;
      result += twoHourForecast;
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
