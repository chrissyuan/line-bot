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
    
    // 使用 F-D0047-071 並指定需要的天氣元素
    const response = await axios.get(
      `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-071?` +
      `Authorization=${CWA_API_KEY}&` +
      `locationName=宜蘭縣&` +
      `elementName=Wx,MinT,MaxT,PoP`
    );

    console.log('API 回應狀態:', response.data.success);
    
    // 檢查回應結構
    if (!response.data.records || !response.data.records.locations) {
      console.log('找不到 records.locations，嘗試其他路徑');
      
      // 嘗試從 result 中取得資料
      if (response.data.result) {
        console.log('從 result 中找資料');
        
        // 嘗試多種可能的欄位名稱（中文和英文）
        const possibleLocationFields = ['location', '地點', 'Location', 'locations', 'Locations'];
        const possibleWeatherFields = ['weatherElement', '天氣元素', 'WeatherElement'];
        
        let locations = null;
        
        // 尋找 locations
        for (const field of possibleLocationFields) {
          if (response.data.result[field]) {
            console.log(`找到 locations 欄位: ${field}`);
            locations = response.data.result[field];
            break;
          }
        }
        
        if (!locations) {
          console.log('找不到 locations 欄位');
          return "";
        }
        
        // 取得第一個 locations 物件
        const locationsObj = Array.isArray(locations) ? locations[0] : locations;
        
        // 尋找 location array
        let locationArray = null;
        for (const field of possibleLocationFields) {
          if (locationsObj[field]) {
            console.log(`找到 location array 欄位: ${field}`);
            locationArray = locationsObj[field];
            break;
          }
        }
        
        if (!locationArray || locationArray.length === 0) {
          console.log('找不到 location array');
          return "";
        }
        
        // 找到宜蘭縣的資料
        const yilanData = locationArray.find(loc => 
          loc.locationName === '宜蘭縣' || 
          loc.地點名稱 === '宜蘭縣' ||
          loc.LocationName === '宜蘭縣'
        );
        
        if (!yilanData) {
          console.log('找不到宜蘭縣資料');
          return "";
        }
        
        // 尋找 weatherElement
        let weatherElements = null;
        for (const field of possibleWeatherFields) {
          if (yilanData[field]) {
            console.log(`找到 weatherElement 欄位: ${field}`);
            weatherElements = yilanData[field];
            break;
          }
        }
        
        if (!weatherElements || weatherElements.length === 0) {
          console.log('找不到 weatherElement');
          return "";
        }
        
        // 解析各種天氣元素
        const wxData = weatherElements.find(e => 
          e.elementName === 'Wx' || e.元素名稱 === 'Wx' || e.天氣描述
        )?.time || [];
        
        const minTData = weatherElements.find(e => 
          e.elementName === 'MinT' || e.元素名稱 === 'MinT' || e.最低溫
        )?.time || [];
        
        const maxTData = weatherElements.find(e => 
          e.elementName === 'MaxT' || e.元素名稱 === 'MaxT' || e.最高溫
        )?.time || [];
        
        const popData = weatherElements.find(e => 
          e.elementName === 'PoP' || e.元素名稱 === 'PoP' || e.降雨機率
        )?.time || [];
        
        console.log(`找到資料: Wx=${wxData.length}, MinT=${minTData.length}, MaxT=${maxTData.length}, PoP=${popData.length}`);
        
        // 獲取未來5天的日期
        const futureDates = getFutureDates(5);
        
        let weekForecast = [];
        
        // 對每個目標日期尋找對應的預報資料
        for (let i = 0; i < futureDates.length; i++) {
          const targetDate = futureDates[i];
          
          // 尋找對應日期的資料
          let wx = wxData.find(item => {
            const startTime = item.startTime || item.開始時間 || item.dataTime;
            return startTime && startTime.substring(5, 10).replace('-', '/') === targetDate;
          });
          
          let minT = minTData.find(item => {
            const startTime = item.startTime || item.開始時間 || item.dataTime;
            return startTime && startTime.substring(5, 10).replace('-', '/') === targetDate;
          });
          
          let maxT = maxTData.find(item => {
            const startTime = item.startTime || item.開始時間 || item.dataTime;
            return startTime && startTime.substring(5, 10).replace('-', '/') === targetDate;
          });
          
          let pop = popData.find(item => {
            const startTime = item.startTime || item.開始時間 || item.dataTime;
            return startTime && startTime.substring(5, 10).replace('-', '/') === targetDate;
          });
          
          if (wx || minT || maxT) {
            // 解析天氣
            let weather = "資料讀取中";
            if (wx?.elementValue) {
              if (Array.isArray(wx.elementValue)) {
                weather = wx.elementValue[0]?.value || wx.elementValue[0]?.measures || "未知";
              }
            }
            
            // 解析溫度
            let minTemp = minT?.elementValue?.[0]?.value || "--";
            let maxTemp = maxT?.elementValue?.[0]?.value || "--";
            let rain = pop?.elementValue?.[0]?.value || "--";
            
            weekForecast.push({
              date: targetDate,
              weather: weather,
              minTemp: minTemp,
              maxTemp: maxTemp,
              pop: rain
            });
          }
        }
        
        // 組合成文字
        if (weekForecast.length > 0) {
          let weekText = "";
          for (const day of weekForecast) {
            weekText += `${day.date} ${day.weather} ${day.maxTemp}°/${day.minTemp}° ☔${day.pop}%\n`;
          }
          return weekText;
        }
      }
    }
    
    return "";

  } catch (error) {
    console.log("7天預報錯誤：", error.message);
    return "";
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
    if (weekForecast) {
      result += weekForecast;
    } else {
      result += `目前無資料\n`;
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
