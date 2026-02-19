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
    
    // 宜蘭縣的鄉鎮預報資料集
    const yilanDatasets = [
      { id: 'F-D0047-069', name: '宜蘭縣' },  // 宜蘭縣
      { id: 'F-D0047-073', name: '宜蘭縣2' }, // 另一個宜蘭縣資料集
      { id: 'F-D0047-001', name: '一般鄉鎮' }  // 全臺鄉鎮
    ];
    
    for (const ds of yilanDatasets) {
      debugText += `\n📡 ${ds.id} (找礁溪鄉):\n`;
      try {
        const response = await axios.get(
          `https://opendata.cwa.gov.tw/api/v1/rest/datastore/${ds.id}?` +
          `Authorization=${CWA_API_KEY}&` +
          `locationName=礁溪鄉`
        );
        
        debugText += `狀態: ${response.data.success}\n`;
        
        if (response.data.records) {
          if (response.data.records.Locations) {
            const locations = response.data.records.Locations;
            debugText += `Locations 長度: ${locations.length}\n`;
            
            if (locations.length > 0) {
              const firstLoc = locations[0];
              if (firstLoc.Location) {
                debugText += `Location 長度: ${firstLoc.Location.length}\n`;
                
                if (firstLoc.Location.length > 0) {
                  // 顯示第一個地點名稱
                  debugText += `第一個地點: ${firstLoc.Location[0].LocationName}\n`;
                  
                  // 找礁溪鄉
                  const jiaoxi = firstLoc.Location.find(l => 
                    l.LocationName && l.LocationName.includes('礁溪')
                  );
                  
                  if (jiaoxi) {
                    debugText += `✅ 找到礁溪鄉！\n`;
                    
                    // 檢查有沒有 PoP
                    const pop = jiaoxi.WeatherElement?.find(e => e.ElementName === 'PoP');
                    if (pop) {
                      debugText += `PoP 筆數: ${pop.Time?.length || 0}\n`;
                      if (pop.Time && pop.Time.length > 0) {
                        debugText += `第一筆降雨: ${pop.Time[0].ElementValue?.[0]?.Value}%\n`;
                      }
                    }
                  } else {
                    debugText += `❌ 找不到礁溪鄉\n`;
                    // 顯示前3個地點
                    debugText += `前3個地點:\n`;
                    for (let i = 0; i < Math.min(3, firstLoc.Location.length); i++) {
                      debugText += `  ${firstLoc.Location[i].LocationName}\n`;
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

    // 獲取今天的日期顯示
    const today = new Date();
    const twTime = new Date(today.getTime() + (8 * 60 * 60 * 1000));
    const todayStr = `${twTime.getFullYear()}/${String(twTime.getMonth() + 1).padStart(2, '0')}/${String(twTime.getDate()).padStart(2, '0')}`;
    const currentTimeStr = `${String(twTime.getHours()).padStart(2, '0')}:${String(twTime.getMinutes()).padStart(2, '0')}`;

    let result = `📍 宜蘭縣 (${todayStr} ${currentTimeStr})\n`;
    result += `━━━━━━━━━━━━\n\n`;
    
    result += `🌡 目前溫度 ${currentAvgTemp}°\n`;
    result += `☁️ ${currentWeather}\n`;
    
    // 備用方案：用36小時預報
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
    
    result += `\n⚠️ 正在尋找宜蘭縣的正確資料集，請輸入 !debug 查看進度\n`;
    result += `━━━━━━━━━━━━\n資料來源：中央氣象署`;

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
