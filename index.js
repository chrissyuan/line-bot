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
    return Math.round(avg * 10) / 10;
  }
  return null;
}

// 獲取未來5天的日期（格式：MM/DD）
function getFutureDates(days = 5) {
  const dates = [];
  const today = new Date();
  const twTime = new Date(today.getTime() + (8 * 60 * 60 * 1000));
  
  for (let i = 1; i <= days; i++) {
    const futureDate = new Date(twTime.getTime() + (i * 24 * 60 * 60 * 1000));
    const month = String(futureDate.getMonth() + 1).padStart(2, '0');
    const day = String(futureDate.getDate()).padStart(2, '0');
    dates.push(`${month}/${day}`);
  }
  
  return dates;
}

// 從 F-D0047-073 API 獲取2小時間隔的預報（使用礁溪鄉）
async function get2HourForecast() {
  try {
    console.log('開始取得2小時間隔預報（礁溪鄉）...');
    
    const response = await axios.get(
      `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-073?` +
      `Authorization=${CWA_API_KEY}&` +
      `locationName=礁溪鄉&` +  // 改為礁溪鄉
      `elementName=Wx,MinT,MaxT,PoP`
    );

    console.log('2小時 API 回應狀態:', response.data.success);
    
    // 探索回應結構
    console.log('API 完整結構:', JSON.stringify(response.data, null, 2).substring(0, 500));
    
    // 嘗試多種可能的資料路徑
    if (response.data.records) {
      console.log('找到 records');
      
      // 檢查是否有 Locations
      if (response.data.records.Locations) {
        console.log('找到 records.Locations');
        const locationsList = response.data.records.Locations;
        console.log(`Locations 陣列長度: ${locationsList.length}`);
        
        if (locationsList.length > 0) {
          const firstLocations = locationsList[0];
          console.log('第一個 Locations 的鍵:', Object.keys(firstLocations));
          
          // 檢查是否有 Location 陣列
          if (firstLocations.Location) {
            console.log(`Location 陣列長度: ${firstLocations.Location.length}`);
            
            // 如果找到資料，嘗試解析
            const locationArray = firstLocations.Location;
            if (locationArray.length > 0) {
              const locationData = locationArray[0];
              console.log('第一個地點名稱:', locationData.LocationName);
              
              // 取得天氣元素
              const weatherElements = locationData.WeatherElement || [];
              console.log('天氣元素:', weatherElements.map(e => e.ElementName));
              
              // 如果有資料，開始解析2小時預報
              const wxData = weatherElements.find(e => e.ElementName === 'Wx')?.Time || [];
              const minTData = weatherElements.find(e => e.ElementName === 'MinT')?.Time || [];
              const maxTData = weatherElements.find(e => e.ElementName === 'MaxT')?.Time || [];
              const popData = weatherElements.find(e => e.ElementName === 'PoP')?.Time || [];
              
              console.log(`找到資料: Wx=${wxData.length}, MinT=${minTData.length}, MaxT=${maxTData.length}, PoP=${popData.length}`);
              
              // 如果有 Wx 資料，顯示第一筆作為範例
              if (wxData.length > 0) {
                console.log('第一筆 Wx 資料:', JSON.stringify(wxData[0], null, 2));
              }
              
              // 解析2小時預報
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
              
              let twoHourText = "";
              let foundCount = 0;
              
              for (let i = 0; i < wxData.length && foundCount < 5; i++) {
                const item = wxData[i];
                const startTime = item.StartTime || item.DataTime;
                
                if (startTime) {
                  const itemHour = parseInt(startTime.substring(11, 13));
                  const itemDate = startTime.substring(5, 10).replace('-', '/');
                  const todayDate = `${String(twTime.getMonth() + 1).padStart(2, '0')}/${String(twTime.getDate()).padStart(2, '0')}`;
                  
                  const isToday = itemDate === todayDate;
                  const isFuture = (isToday && itemHour >= startHour) || 
                                  (!isToday && foundCount > 0);
                  
                  if (isFuture) {
                    const endHour = (itemHour + 2) % 24;
                    const startTimeStr = `${String(itemHour).padStart(2, '0')}:00`;
                    const endTimeStr = `${String(endHour).padStart(2, '0')}:00`;
                    
                    let dayMark = "";
                    if (!isToday) {
                      dayMark = " (明日)";
                    } else if (endHour < itemHour) {
                      dayMark = " (跨日)";
                    }
                    
                    const minT = minTData[i]?.ElementValue?.[0]?.Value;
                    const maxT = maxTData[i]?.ElementValue?.[0]?.Value;
                    const pop = popData[i]?.ElementValue?.[0]?.Value;
                    
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
              
              return twoHourText || "找到資料但無法解析";
            }
          }
        }
      }
    }
    
    return "無法取得礁溪鄉的2小時預報資料";

  } catch (error) {
    console.log("2小時預報錯誤：", error.message);
    if (error.response) {
      console.log("錯誤狀態：", error.response.status);
      console.log("錯誤資料：", error.response.data);
    }
    return null;
  }
}

// 從 API 獲取未來5天預報（維持原來的宜蘭縣）
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
    
    const currentWeather = wx[0].parameter.parameterName;
    const currentMinTemp = minT[0].parameter.parameterName;
    const currentMaxTemp = maxT[0].parameter.parameterName;
    const currentPop = pop[0].parameter.parameterName;
    
    // ===== 從 F-D0047-073 獲取真正的2小時間隔預報（礁溪鄉）=====
    const twoHourForecast = await get2HourForecast();

    // ===== 從 F-D0047-071 獲取未來5天預報（宜蘭縣）=====
    const weekForecast = await get7DayForecast();

    // 獲取今天的日期顯示
    const today = new Date();
    const twTime = new Date(today.getTime() + (8 * 60 * 60 * 1000));
    const todayStr = `${twTime.getFullYear()}/${String(twTime.getMonth() + 1).padStart(2, '0')}/${String(twTime.getDate()).padStart(2, '0')}`;
    const currentTimeStr = `${String(twTime.getHours()).padStart(2, '0')}:${String(twTime.getMinutes()).padStart(2, '0')}`;

    let result = `📍 宜蘭縣 (${todayStr} ${currentTimeStr})\n`;
    result += `━━━━━━━━━━━━\n\n`;
    
    result += `🌡 目前氣溫：${currentMinTemp}°C ~ ${currentMaxTemp}°C\n`;
    result += `☁️ 天氣：${currentWeather}\n`;
    result += `☔ 降雨機率：${currentPop}%\n`;
    
    if (twoHourForecast) {
      result += `\n🕒 未來10小時（礁溪鄉2小時間隔）\n`;
      result += twoHourForecast;
    } else {
      result += `\n🕒 未來10小時（使用36小時預報模擬）\n`;
      
      // 如果2小時API失敗，用原來的36小時預報模擬
      const timeSlots = generate2HourSlots();
      for (let i = 0; i < timeSlots.length; i++) {
        const slot = timeSlots[i];
        const forecastIndex = Math.min(i, wx.length - 1);
        const minTemp = parseFloat(minT[forecastIndex]?.parameter?.parameterName);
        const maxTemp = parseFloat(maxT[forecastIndex]?.parameter?.parameterName);
        
        let avgTemp = null;
        if (!isNaN(minTemp) && !isNaN(maxTemp)) {
          avgTemp = Math.round(((minTemp + maxTemp) / 2) * 10) / 10;
        }
        
        let slotText = `${slot.start}-${slot.end}${slot.dayMark} `;
        if (avgTemp !== null) {
          slotText += `溫度 ${avgTemp}°`;
        }
        result += slotText + '\n';
      }
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

// 生成2小時間隔的時間區間（備用方案）
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
