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
      console.error('Webhook 錯誤:', err);
      res.status(200).end();
    });
});

// 處理 Line 事件
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userMessage = event.message.text;
  
  if (userMessage === '!debug') {
    const debugInfo = await getDebugInfo();
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: debugInfo
    });
  }
  
  if (userMessage.includes('天氣') || userMessage.includes('宜蘭')) {
    try {
      const weatherData = await getCurrentWeather();
      
      const replyText = weatherData || '無法取得天氣資料';
      const limitedText = replyText.length > 5000 ? replyText.substring(0, 5000) + '...' : replyText;
      
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: limitedText
      });
    } catch (error) {
      console.error('取得天氣資料錯誤:', error);
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: '⚠️ 取得天氣資料時發生錯誤'
      });
    }
  }
  
  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: '請輸入「天氣」或「宜蘭」來查詢天氣資訊（輸入 !debug 查看API原始資料）'
  });
}

// 取得除錯資訊
async function getDebugInfo() {
  try {
    let debugText = "🔍 API 除錯資訊\n\n";
    
    // 使用 F-D0047-001
    debugText += `📡 F-D0047-001 (礁溪鄉):\n`;
    try {
      const response = await axios.get(
        `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-001?` +
        `Authorization=${CWA_API_KEY}&` +
        `locationName=礁溪鄉`
      );
      
      debugText += `狀態: ${response.data.success}\n`;
      
      if (response.data.records && response.data.records.Locations) {
        const locations = response.data.records.Locations;
        debugText += `Locations 長度: ${locations.length}\n`;
        
        if (locations.length > 0) {
          const firstLoc = locations[0];
          if (firstLoc.Location) {
            debugText += `Location 長度: ${firstLoc.Location.length}\n`;
            
            if (firstLoc.Location.length > 0) {
              const jiaoxi = firstLoc.Location[0];
              debugText += `地點名稱: ${jiaoxi.LocationName}\n`;
              
              if (jiaoxi.WeatherElement) {
                const elements = jiaoxi.WeatherElement.map(e => e.ElementName).join(', ');
                debugText += `天氣元素: ${elements}\n`;
                
                const pop = jiaoxi.WeatherElement.find(e => e.ElementName === 'PoP');
                if (pop && pop.Time) {
                  debugText += `降雨機率筆數: ${pop.Time.length}\n`;
                  if (pop.Time.length > 0) {
                    debugText += `第一筆時間: ${pop.Time[0].StartTime}\n`;
                    debugText += `第一筆數值: ${pop.Time[0].ElementValue?.[0]?.Value}%\n`;
                  }
                }
              }
            }
          }
        }
      }
    } catch (e) {
      debugText += `❌ 失敗: ${e.message}\n`;
    }
    
    if (debugText.length > 4900) {
      debugText = debugText.substring(0, 4900) + '...';
    }
    
    return debugText;
    
  } catch (error) {
    return `除錯失敗: ${error.message}`;
  }
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

// 從 F-D0047-001 API 獲取2小時間隔的預報（礁溪鄉）
async function getHourlyForecast() {
  try {
    console.log('開始取得小時預報（F-D0047-001 礁溪鄉）...');
    
    const response = await axios.get(
      `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-001?` +
      `Authorization=${CWA_API_KEY}&` +
      `locationName=礁溪鄉&` +
      `elementName=Wx,MinT,MaxT,PoP`
    );

    console.log('小時預報 API 回應狀態:', response.data.success);
    
    if (!response.data.records || !response.data.records.Locations) {
      console.log('找不到 records.Locations');
      return { temp: null, pop: null };
    }
    
    const locationsList = response.data.records.Locations;
    if (!locationsList || locationsList.length === 0) {
      return { temp: null, pop: null };
    }
    
    const firstLocations = locationsList[0];
    const locationArray = firstLocations.Location;
    if (!locationArray || locationArray.length === 0) {
      return { temp: null, pop: null };
    }
    
    // 礁溪鄉應該是第一個地點
    const jiaoxiData = locationArray[0];
    console.log('使用地點:', jiaoxiData.LocationName);
    
    const weatherElements = jiaoxiData.WeatherElement || [];
    
    const wxData = weatherElements.find(e => e.ElementName === 'Wx')?.Time || [];
    const minTData = weatherElements.find(e => e.ElementName === 'MinT')?.Time || [];
    const maxTData = weatherElements.find(e => e.ElementName === 'MaxT')?.Time || [];
    const popData = weatherElements.find(e => e.ElementName === 'PoP')?.Time || [];
    
    console.log(`找到資料 - 天氣:${wxData.length}, 低溫:${minTData.length}, 高溫:${maxTData.length}, 降雨:${popData.length}`);
    
    // 獲取當前時間
    const now = new Date();
    const twTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    const currentHour = twTime.getHours();
    const currentMinute = twTime.getMinutes();
    const currentDate = `${String(twTime.getMonth() + 1).padStart(2, '0')}/${String(twTime.getDate()).padStart(2, '0')}`;
    
    // 決定起始時間
    let startHour = currentHour;
    if (currentMinute < 30) {
      startHour = currentHour + 1;
    } else {
      startHour = currentHour + 2;
    }
    
    let tempText = "";
    let popText = "";
    let foundCount = 0;
    
    // 使用溫度資料
    if (minTData.length > 0 && maxTData.length > 0) {
      for (let i = 0; i < minTData.length && foundCount < 5; i++) {
        const minItem = minTData[i];
        const maxItem = maxTData[i];
        const popItem = popData[i];
        
        const startTime = minItem.StartTime || minItem.DataTime;
        
        if (startTime) {
          const itemHour = parseInt(startTime.substring(11, 13));
          const itemDate = startTime.substring(5, 10).replace('-', '/');
          
          const isToday = itemDate === currentDate;
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
            
            const minTemp = minItem.ElementValue?.[0]?.Value;
            const maxTemp = maxItem.ElementValue?.[0]?.Value;
            const pop = popItem?.ElementValue?.[0]?.Value;
            
            let avgTemp = null;
            if (minTemp && maxTemp) {
              avgTemp = calculateAverageTemp(minTemp, maxTemp);
            }
            
            // 溫度文字
            let tempSlot = `${startTimeStr}-${endTimeStr}${dayMark}`;
            if (avgTemp !== null) {
              tempSlot += ` ${avgTemp}°`;
            }
            tempText += tempSlot + '\n';
            
            // 降雨文字
            if (pop && pop !== '--') {
              let popSlot = `${startTimeStr}-${endTimeStr}${dayMark} ☔${pop}%`;
              popText += popSlot + '\n';
            }
            
            foundCount++;
          }
        }
      }
    }
    
    return {
      temp: tempText || null,
      pop: popText || null,
      location: jiaoxiData.LocationName
    };

  } catch (error) {
    console.log("小時預報錯誤：", error.message);
    return { temp: null, pop: null, location: null };
  }
}

// 從 API 獲取未來5天預報（礁溪鄉）
async function get7DayForecast() {
  try {
    const response = await axios.get(
      `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-001?` +
      `Authorization=${CWA_API_KEY}&` +
      `locationName=礁溪鄉&` +
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
    
    const jiaoxiData = locationArray[0];
    
    const weatherElements = jiaoxiData.WeatherElement || [];
    
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
        const avgTemp = calculateAverageTemp(minTemp, maxTemp);
        const rain = pop?.ElementValue?.[0]?.Value;
        
        weekForecast.push({
          date: targetDate,
          weather: weather,
          avgTemp: avgTemp,
          pop: rain
        });
      }
    }
    
    if (weekForecast.length > 0) {
      let weekText = "";
      for (const day of weekForecast) {
        weekText += `${day.date} ${day.weather}`;
        if (day.avgTemp !== null) {
          weekText += ` ${day.avgTemp}°`;
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

async function getCurrentWeather() {
  try {
    // ===== 36小時預報（用於目前天氣）=====
    const res36 = await axios.get(
      `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001?Authorization=${CWA_API_KEY}&locationName=宜蘭縣`
    );

    const location36 = res36.data.records.location[0];
    const elements36 = location36.weatherElement;

    const wx = elements36.find(e => e.elementName === "Wx").time;
    const minT = elements36.find(e => e.elementName === "MinT").time;
    const maxT = elements36.find(e => e.elementName === "MaxT").time;
    
    const currentWeather = wx[0].parameter.parameterName;
    const currentMinTemp = parseFloat(minT[0].parameter.parameterName);
    const currentMaxTemp = parseFloat(maxT[0].parameter.parameterName);
    
    const currentAvgTemp = Math.round(((currentMinTemp + currentMaxTemp) / 2) * 10) / 10;
    
    // ===== 從 F-D0047-001 獲取小時預報（礁溪鄉）=====
    const hourly = await getHourlyForecast();

    // ===== 從 F-D0047-001 獲取未來5天預報（礁溪鄉）=====
    const weekForecast = await get7DayForecast();

    // 獲取今天的日期顯示
    const today = new Date();
    const twTime = new Date(today.getTime() + (8 * 60 * 60 * 1000));
    const todayStr = `${twTime.getFullYear()}/${String(twTime.getMonth() + 1).padStart(2, '0')}/${String(twTime.getDate()).padStart(2, '0')}`;
    const currentTimeStr = `${String(twTime.getHours()).padStart(2, '0')}:${String(twTime.getMinutes()).padStart(2, '0')}`;

    let result = `📍 礁溪鄉 (${todayStr} ${currentTimeStr})\n`;
    result += `━━━━━━━━━━━━\n\n`;
    
    result += `🌡 目前溫度 ${currentAvgTemp}°\n`;
    result += `☁️ ${currentWeather}\n`;
    
    // 優先顯示降雨機率
    if (hourly.pop) {
      result += `\n🕒 未來10小時降雨機率\n`;
      result += hourly.pop;
    } 
    // 如果沒有降雨機率，顯示溫度
    else if (hourly.temp) {
      result += `\n🕒 未來10小時溫度\n`;
      result += hourly.temp;
    }
    // 最後的備用方案
    else {
      result += `\n🕒 未來10小時溫度（36hr預報）\n`;
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
        
        let slotText = `${slot.start}-${slot.end}${slot.dayMark}`;
        if (avgTemp !== null) {
          slotText += ` ${avgTemp}°`;
        }
        result += slotText + '\n';
      }
    }
    
    if (weekForecast) {
      result += `\n📅 未來5天\n`;
      result += weekForecast;
    }
    
    result += `\n━━━━━━━━━━━━\n資料來源：中央氣象署 (F-D0047-001)`;

    return result;

  } catch (error) {
    console.log("錯誤內容：", error.response?.data || error.message);
    return "⚠️ 無法取得天氣資料，請稍後再試";
  }
}

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`天氣機器人正在連接埠 ${PORT} 上運行`);
  console.log(`Webhook URL: https://line-bot-agjf.onrender.com/webhook`);
});

module.exports = app;
