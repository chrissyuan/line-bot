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

// 從 F-D0047-073 API 獲取2小時間隔的預報（支援中文欄位）
async function get2HourForecast() {
  try {
    console.log('開始取得2小時間隔預報（礁溪鄉）...');
    
    const response = await axios.get(
      `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-073?` +
      `Authorization=${CWA_API_KEY}&` +
      `locationName=礁溪鄉&`
    );

    console.log('2小時 API 回應狀態:', response.data.success);
    
    // 根據實際回應，資料在 result 中
    if (!response.data.result) {
      console.log('找不到 result');
      return null;
    }
    
    // 從 result 中取得 locations（注意是中文欄位）
    const locationsList = response.data.result.locations || response.data.result.Locations;
    if (!locationsList || locationsList.length === 0) {
      console.log('找不到 locations');
      return null;
    }
    
    console.log(`Locations 陣列長度: ${locationsList.length}`);
    
    // 遍歷所有 locations 找到礁溪鄉
    let targetLocation = null;
    let targetLocationName = '';
    
    for (const locationsObj of locationsList) {
      const locationArray = locationsObj.Location || locationsObj.地點;
      if (locationArray && locationArray.length > 0) {
        for (const loc of locationArray) {
          const locName = loc.LocationName || loc.地點名稱;
          console.log('找到地點:', locName);
          
          // 檢查是否為礁溪鄉（可能的名稱格式）
          if (locName && (locName.includes('礁溪') || locName === '礁溪鄉')) {
            targetLocation = loc;
            targetLocationName = locName;
            break;
          }
        }
      }
      if (targetLocation) break;
    }
    
    if (!targetLocation) {
      console.log('找不到礁溪鄉，嘗試找第一個地點');
      // 如果找不到礁溪鄉，就用第一個地點
      const firstLocationsObj = locationsList[0];
      const firstLocationArray = firstLocationsObj.Location || firstLocationsObj.地點;
      if (firstLocationArray && firstLocationArray.length > 0) {
        targetLocation = firstLocationArray[0];
        targetLocationName = targetLocation.LocationName || targetLocation.地點名稱 || '未知';
        console.log('使用第一個地點:', targetLocationName);
      } else {
        return null;
      }
    }
    
    console.log('使用地點:', targetLocationName);
    
    // 取得天氣元素（注意是中文欄位）
    const weatherElements = targetLocation.WeatherElement || targetLocation.天氣元素 || [];
    console.log('天氣元素:', weatherElements.map(e => e.ElementName || e.元素名稱));
    
    // 定義中文和英文的欄位對應
    const wxData = weatherElements.find(e => 
      (e.ElementName === 'Wx' || e.元素名稱 === '天氣現象' || e.元素名稱 === '天氣預報綜合描述')
    )?.Time || weatherElements.find(e => e.元素名稱 === '天氣預報綜合描述')?.Time || [];
    
    const tempData = weatherElements.find(e => 
      (e.ElementName === 'T' || e.元素名稱 === '溫度')
    )?.Time || [];
    
    const popData = weatherElements.find(e => 
      (e.ElementName === 'PoP' || e.元素名稱 === '3小時進化機率' || e.元素名稱 === '降雨機率')
    )?.Time || [];
    
    console.log(`找到資料: Wx=${wxData.length}, 溫度=${tempData.length}, PoP=${popData.length}`);
    
    // 如果沒有找到任何資料，返回 null
    if (wxData.length === 0 && tempData.length === 0) {
      console.log('沒有找到任何天氣資料');
      return null;
    }
    
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
    
    // 使用溫度資料（如果有的話）
    const timeData = tempData.length > 0 ? tempData : wxData;
    
    let twoHourText = "";
    let foundCount = 0;
    
    for (let i = 0; i < timeData.length && foundCount < 5; i++) {
      const item = timeData[i];
      const startTime = item.StartTime || item.開始時間 || item.DataTime;
      
      if (startTime) {
        const itemHour = parseInt(startTime.substring(11, 13));
        const itemDate = startTime.substring(5, 10).replace('-', '/');
        
        // 判斷是否為未來時段
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
          
          // 取得溫度（從 ElementValue 或 元素值）
          let temp = null;
          if (item.ElementValue) {
            if (Array.isArray(item.ElementValue)) {
              temp = item.ElementValue[0]?.Value || item.ElementValue[0]?.值;
            }
          }
          
          // 取得降雨機率
          let pop = null;
          if (popData[i]?.ElementValue) {
            if (Array.isArray(popData[i].ElementValue)) {
              pop = popData[i].ElementValue[0]?.Value || popData[i].ElementValue[0]?.值;
            }
          }
          
          let slotText = `${startTimeStr}-${endTimeStr}${dayMark} `;
          if (temp) {
            slotText += `溫度 ${temp}°`;
          } else {
            // 如果沒有溫度資料，至少顯示時間
            slotText += `預報`;
          }
          if (pop && pop !== '--') {
            slotText += ` ☔${pop}%`;
          }
          twoHourText += slotText + '\n';
          foundCount++;
        }
      }
    }
    
    if (foundCount === 0) {
      // 如果找不到未來時段，顯示前5筆資料作為除錯
      twoHourText = "原始資料（前5筆）：\n";
      for (let i = 0; i < Math.min(5, timeData.length); i++) {
        const item = timeData[i];
        const startTime = item.StartTime || item.開始時間 || item.DataTime;
        if (startTime) {
          twoHourText += `${startTime.substring(5, 16)}: ${JSON.stringify(item.ElementValue)}\n`;
        }
      }
    }
    
    return twoHourText;

  } catch (error) {
    console.log("2小時預報錯誤：", error.message);
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
    
    // ===== 從 F-D0047-073 獲取2小時間隔預報（礁溪鄉）=====
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

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`天氣機器人正在連接埠 ${PORT} 上運行`);
  console.log(`Webhook URL: https://line-bot-agjf.onrender.com/webhook`);
});

module.exports = app;
