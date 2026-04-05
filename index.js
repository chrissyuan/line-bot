const express = require('express');
const axios = require('axios');
const line = require('@line/bot-sdk');

// 導入早餐店資料
const breakfastData = require('./data/breakfastShops');
// 導入午餐店資料
const lunchData = require('./data/lunchShops');

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

// ==================== 工具函數 ====================

function getElementValue(elementValue) {
  if (!elementValue) return null;
  if (Array.isArray(elementValue)) {
    if (elementValue.length > 0) {
      const item = elementValue[0];
      if (item.Temperature !== undefined) return item.Temperature;
      if (item.ProbabilityOfPrecipitation !== undefined) return item.ProbabilityOfPrecipitation;
      if (item.Value !== undefined) return item.Value;
      if (item.value !== undefined) return item.value;
      if (typeof item === 'string' || typeof item === 'number') return item;
    }
  }
  if (typeof elementValue === 'object') {
    if (elementValue.Temperature !== undefined) return elementValue.Temperature;
    if (elementValue.ProbabilityOfPrecipitation !== undefined) return elementValue.ProbabilityOfPrecipitation;
    if (elementValue.Value !== undefined) return elementValue.Value;
    if (elementValue.value !== undefined) return elementValue.value;
  }
  if (typeof elementValue === 'string' || typeof elementValue === 'number') return elementValue;
  return null;
}

function getTimeString(timeObj) {
  if (!timeObj) return null;
  return timeObj.DataTime || timeObj.dataTime || timeObj.StartTime || timeObj.startTime || null;
}

function getDates() {
  const dates = [];
  const today = new Date();
  const twTime = new Date(today.getTime() + (8 * 60 * 60 * 1000));
  for (let i = 0; i <= 3; i++) {
    const targetDate = new Date(twTime.getTime() + (i * 24 * 60 * 60 * 1000));
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    dates.push(`${month}/${day}`);
  }
  return dates;
}

function generate2HourSlots() {
  const slots = [];
  const now = new Date();
  const twTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  const currentHour = twTime.getHours();
  const currentMinute = twTime.getMinutes();
  let startHour = currentMinute < 30 ? currentHour + 1 : currentHour + 2;
  let dayMark = '';
  if (startHour >= 24) { startHour -= 24; dayMark = ' (明日)'; }
  for (let i = 0; i < 5; i++) {
    const slotStartHour = (startHour + (i * 2)) % 24;
    const slotEndHour = (slotStartHour + 2) % 24;
    const startTimeStr = `${String(slotStartHour).padStart(2, '0')}:00`;
    const endTimeStr = `${String(slotEndHour).padStart(2, '0')}:00`;
    let slotDayMark = (i > 0 && dayMark) ? ' (明日)' : (slotEndHour < slotStartHour ? ' (跨日)' : dayMark);
    slots.push({ start: startTimeStr, end: endTimeStr, dayMark: slotDayMark });
  }
  return slots;
}

// ==================== API 資料獲取函數 ====================

async function getHourlyTemperature() {
  try {
    console.log('開始取得小時溫度預報（F-D0047-001 礁溪鄉）...');
    const response = await axios.get(
      `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-001?Authorization=${CWA_API_KEY}&locationName=礁溪鄉`
    );
    console.log('API 回應狀態:', response.data.success);
    if (!response.data.records?.Locations) return null;
    const locationsList = response.data.records.Locations;
    if (!locationsList?.length) return null;
    const jiaoxiData = locationsList[0].Location?.find(l => l.LocationName === '礁溪鄉');
    if (!jiaoxiData) { console.log('找不到礁溪鄉'); return null; }
    console.log('使用地點:', jiaoxiData.LocationName);

    const weatherElements = jiaoxiData.WeatherElement || [];
    const tempData = weatherElements.find(e => e.ElementName === '溫度')?.Time || [];
    console.log(`找到溫度資料筆數: ${tempData.length}`);
    if (tempData.length === 0) return null;

    const now = new Date();
    const twTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    const currentHour = twTime.getHours();
    const currentMinute = twTime.getMinutes();
    const currentDate = `${String(twTime.getMonth() + 1).padStart(2, '0')}/${String(twTime.getDate()).padStart(2, '0')}`;

    let startHour = currentMinute < 30 ? currentHour + 1 : currentHour + 2;
    let startDay = 0;
    if (startHour >= 24) { startHour -= 24; startDay = 1; }

    let tempText = '';
    let foundCount = 0;

    for (let i = 0; i < tempData.length && foundCount < 5; i++) {
      const tempItem = tempData[i];
      const timeStr = getTimeString(tempItem);
      if (timeStr) {
        try {
          const itemHour = parseInt(timeStr.substring(11, 13));
          const itemDate = timeStr.substring(5, 10).replace('-', '/');
          const [itemMonth, itemDay] = itemDate.split('/').map(Number);
          const [currMonth, currDay] = currentDate.split('/').map(Number);
          const itemDateObj = new Date(2026, itemMonth - 1, itemDay);
          const currDateObj = new Date(2026, currMonth - 1, currDay);
          const dayDiff = Math.floor((itemDateObj - currDateObj) / (24 * 60 * 60 * 1000));
          let isFuture = dayDiff === startDay ? itemHour >= startHour : dayDiff > startDay;
          if (isFuture) {
            const endHour = (itemHour + 2) % 24;
            const startTimeStr = `${String(itemHour).padStart(2, '0')}:00`;
            const endTimeStr = `${String(endHour).padStart(2, '0')}:00`;
            let dayMark = dayDiff === 1 ? ' (明日)' : dayDiff > 1 ? ` (+${dayDiff})` : '';
            const temp = getElementValue(tempItem.ElementValue);
            if (temp) { tempText += `${startTimeStr}-${endTimeStr}${dayMark} ${temp}°\n`; foundCount++; }
          }
        } catch (e) { console.log('解析時間錯誤:', e.message); }
      }
    }
    return tempText || null;
  } catch (error) {
    console.log('小時溫度預報錯誤：', error.message);
    return null;
  }
}

async function getDailyForecast() {
  try {
    const response = await axios.get(
      `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-001?Authorization=${CWA_API_KEY}&locationName=礁溪鄉`
    );
    if (!response.data.records?.Locations) return '';
    const jiaoxiData = response.data.records.Locations[0]?.Location?.find(l => l.LocationName === '礁溪鄉');
    if (!jiaoxiData) return '';

    const weatherElements = jiaoxiData.WeatherElement || [];
    const wxData = weatherElements.find(e => e.ElementName === '天氣現象')?.Time || [];
    const tempData = weatherElements.find(e => e.ElementName === '溫度')?.Time || [];
    const popData = weatherElements.find(e => e.ElementName === '3小時降雨機率')?.Time || [];

    const dates = getDates();
    let forecast = [];

    for (let i = 0; i < dates.length; i++) {
      const targetDate = dates[i];
      const wx = wxData.find(item => {
        const timeStr = getTimeString(item);
        if (!timeStr) return false;
        const itemDate = timeStr.substring(5, 10).replace('-', '/');
        const itemHour = parseInt(timeStr.substring(11, 13));
        return itemDate === targetDate && itemHour >= 10 && itemHour <= 14;
      }) || wxData.find(item => {
        const timeStr = getTimeString(item);
        return timeStr && timeStr.substring(5, 10).replace('-', '/') === targetDate;
      });

      const tempItems = tempData.filter(item => {
        const timeStr = getTimeString(item);
        return timeStr && timeStr.substring(5, 10).replace('-', '/') === targetDate;
      });
      const popItems = popData.filter(item => {
        const timeStr = getTimeString(item);
        return timeStr && timeStr.substring(5, 10).replace('-', '/') === targetDate;
      });

      const weather = getElementValue(wx?.ElementValue) || '';
      const temps = tempItems.map(item => { const val = getElementValue(item.ElementValue); return val ? parseFloat(val) : null; }).filter(t => t !== null);
      const minTemp = temps.length > 0 ? Math.min(...temps) : null;
      const maxTemp = temps.length > 0 ? Math.max(...temps) : null;
      const pops = popItems.map(item => { const val = getElementValue(item.ElementValue); return val ? parseFloat(val) : null; }).filter(p => p !== null && p > 0);
      const maxPop = pops.length > 0 ? Math.max(...pops) : null;

      let dayText = i === 0 ? `${targetDate} (今日)` : targetDate;
      if (weather) dayText += ` ${weather}`;
      if (minTemp !== null && maxTemp !== null) {
        dayText += minTemp === maxTemp ? ` ${minTemp}°` : ` ${minTemp}°~${maxTemp}°`;
      } else if (minTemp !== null) dayText += ` ${minTemp}°`;
      else if (maxTemp !== null) dayText += ` ${maxTemp}°`;
      if (maxPop !== null) dayText += ` ☔${maxPop}%`;
      forecast.push(dayText);
    }
    return forecast.join('\n');
  } catch (error) {
    console.log('每日預報錯誤：', error.message);
    return '';
  }
}

async function getCurrentWeather() {
  try {
    const res36 = await axios.get(
      `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001?Authorization=${CWA_API_KEY}&locationName=宜蘭縣`
    );
    const location36 = res36.data.records.location[0];
    const elements36 = location36.weatherElement;
    const wx = elements36.find(e => e.elementName === 'Wx').time;
    const pop = elements36.find(e => e.elementName === 'PoP').time;
    const minT = elements36.find(e => e.elementName === 'MinT').time;
    const maxT = elements36.find(e => e.elementName === 'MaxT').time;

    const currentWeather = wx[0].parameter.parameterName;
    const currentMinTemp = parseFloat(minT[0].parameter.parameterName);
    const currentMaxTemp = parseFloat(maxT[0].parameter.parameterName);
    const currentPop = pop[0].parameter.parameterName;
    const currentAvgTemp = Math.round(((currentMinTemp + currentMaxTemp) / 2) * 10) / 10;

    const hourlyTemp = await getHourlyTemperature();
    const dailyForecast = await getDailyForecast();

    const today = new Date();
    const twTime = new Date(today.getTime() + (8 * 60 * 60 * 1000));
    const todayStr = `${twTime.getFullYear()}/${String(twTime.getMonth() + 1).padStart(2, '0')}/${String(twTime.getDate()).padStart(2, '0')}`;
    const currentTimeStr = `${String(twTime.getHours()).padStart(2, '0')}:${String(twTime.getMinutes()).padStart(2, '0')}`;

    let result = `📍 礁溪鄉 (${todayStr} ${currentTimeStr})\n`;
    result += `━━━━━━━━━━━━\n\n`;
    result += `🌡 目前溫度 ${currentAvgTemp}°`;
    if (currentPop && currentPop !== '--') result += `  ☔${currentPop}%`;
    result += `\n☁️ ${currentWeather}\n`;

    if (hourlyTemp) {
      result += `\n🕒 未來10小時溫度\n${hourlyTemp}`;
    } else {
      result += `\n🕒 未來10小時溫度（36hr預報）\n`;
      const timeSlots = generate2HourSlots();
      for (let i = 0; i < timeSlots.length; i++) {
        const slot = timeSlots[i];
        const forecastIndex = Math.min(i, wx.length - 1);
        const minTemp = parseFloat(minT[forecastIndex]?.parameter?.parameterName);
        const maxTemp = parseFloat(maxT[forecastIndex]?.parameter?.parameterName);
        let avgTemp = (!isNaN(minTemp) && !isNaN(maxTemp)) ? Math.round(((minTemp + maxTemp) / 2) * 10) / 10 : null;
        result += `${slot.start}-${slot.end}${slot.dayMark}${avgTemp !== null ? ` ${avgTemp}°` : ''}\n`;
      }
    }

    if (dailyForecast) result += `\n📅 今日+未來3天\n${dailyForecast}`;
    result += `\n━━━━━━━━━━━━\n資料來源：中央氣象署 (F-D0047-001)`;
    return result;
  } catch (error) {
    console.log('錯誤內容：', error.response?.data || error.message);
    return '⚠️ 無法取得天氣資料，請稍後再試';
  }
}

async function getDebugInfo() {
  try {
    let debugText = '🔍 API 除錯資訊\n\n';
    debugText += '📡 F-D0047-001 (礁溪鄉):\n';
    try {
      const response = await axios.get(
        `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-001?Authorization=${CWA_API_KEY}&locationName=礁溪鄉`
      );
      debugText += `狀態: ${response.data.success}\n`;
      if (response.data.records?.Locations) {
        const locations = response.data.records.Locations;
        debugText += `Locations 長度: ${locations.length}\n`;
        if (locations.length > 0 && locations[0].Location) {
          debugText += `Location 長度: ${locations[0].Location.length}\n`;
          const jiaoxi = locations[0].Location.find(l => l.LocationName === '礁溪鄉');
          if (jiaoxi) {
            debugText += `✅ 找到礁溪鄉！\n`;
            if (jiaoxi.WeatherElement) {
              debugText += `可用元素: ${jiaoxi.WeatherElement.map(e => e.ElementName).join(', ')}\n`;
              const temp = jiaoxi.WeatherElement.find(e => e.ElementName === '溫度');
              if (temp?.Time) {
                debugText += `溫度筆數: ${temp.Time.length}\n`;
                const dates = [...new Set(temp.Time.map(t => { const ts = getTimeString(t); return ts ? ts.substring(5, 10).replace('-', '/') : null; }).filter(d => d))];
                debugText += `可用日期: ${dates.sort().join(', ')}\n`;
              }
            }
          }
        }
      }
    } catch (e) { debugText += `❌ 失敗: ${e.message}\n`; }

    debugText += `\n🍳 早餐店資料庫\n店家總數: ${breakfastData.getBreakfastShopsCount()} 間\n`;
    debugText += `\n🍱 午餐店資料庫\n店家總數: ${lunchData.getLunchShopsCount()} 間\n`;

    if (debugText.length > 4900) debugText = debugText.substring(0, 4900) + '...';
    return debugText;
  } catch (error) {
    return `除錯失敗: ${error.message}`;
  }
}

// ==================== 查詢處理函數 ====================

/**
 * 處理早餐店查詢
 */
async function handleBreakfastQuery(userMessage, replyToken) {
  if (userMessage === '早餐') {
    const allShops = breakfastData.getAllBreakfastShops();
    return client.replyMessage(replyToken, {
      type: 'text',
      text: breakfastData.formatBreakfastMessage(allShops)
    });
  }

  if (userMessage.includes('早餐')) {
    const keyword = userMessage.replace('早餐', '').trim();
    if (keyword) {
      const shopDetail = breakfastData.getShopDetailWithImage(keyword);
      if (shopDetail) return client.replyMessage(replyToken, shopDetail);

      const results = breakfastData.searchBreakfastShops(keyword);
      if (results.length === 0) {
        return client.replyMessage(replyToken, {
          type: 'text',
          text: `🔍 找不到「${keyword}」相關的早餐店\n\n💡 提示：輸入「早餐」查看所有店家列表`
        });
      }
      if (results.length === 1) {
        return client.replyMessage(replyToken, breakfastData.getShopDetailWithImage(results[0].name));
      }
      let message = `🔍 找到 ${results.length} 間相關店家\n━━━━━━━━━━━━\n\n`;
      results.forEach((shop, index) => { message += `${index + 1}. ${shop.name}\n`; });
      message += `\n💡 輸入完整店名查看詳細資訊`;
      return client.replyMessage(replyToken, { type: 'text', text: message });
    }
  }
  return null;
}

/**
 * 處理午餐店查詢
 */
async function handleLunchQuery(userMessage, replyToken) {
  // 只輸入「午餐」，顯示所有店家
  if (userMessage === '午餐') {
    const allShops = lunchData.getAllLunchShops();
    return client.replyMessage(replyToken, {
      type: 'text',
      text: lunchData.formatLunchMessage(allShops)
    });
  }

  // 輸入「午餐 店名」，進行搜尋
  if (userMessage.includes('午餐')) {
    const keyword = userMessage.replace('午餐', '').trim();
    if (keyword) {
      // 先嘗試完全匹配
      const shopDetail = lunchData.getLunchShopDetailWithImage(keyword);
      if (shopDetail) return client.replyMessage(replyToken, shopDetail);

      // 模糊搜尋
      const results = lunchData.searchLunchShops(keyword);
      if (results.length === 0) {
        return client.replyMessage(replyToken, {
          type: 'text',
          text: `🔍 找不到「${keyword}」相關的午餐店\n\n💡 提示：輸入「午餐」查看所有店家列表`
        });
      }
      if (results.length === 1) {
        return client.replyMessage(replyToken, lunchData.getLunchShopDetailWithImage(results[0].name));
      }
      let message = `🔍 找到 ${results.length} 間相關店家\n━━━━━━━━━━━━\n\n`;
      results.forEach((shop, index) => { message += `${index + 1}. ${shop.name}\n`; });
      message += `\n💡 輸入完整店名查看詳細資訊`;
      return client.replyMessage(replyToken, { type: 'text', text: message });
    }
  }
  return null;
}

// ==================== Line Bot 事件處理 ====================

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userMessage = event.message.text.trim();

  // 除錯指令
  if (userMessage === '!debug') {
    const debugInfo = await getDebugInfo();
    return client.replyMessage(event.replyToken, { type: 'text', text: debugInfo });
  }

  // 午餐查詢（放在早餐前面避免關鍵字衝突）
  if (userMessage.includes('午餐')) {
    return await handleLunchQuery(userMessage, event.replyToken);
  }

  // 早餐查詢
  if (userMessage.includes('早餐')) {
    return await handleBreakfastQuery(userMessage, event.replyToken);
  }

  // 天氣查詢
  if (userMessage.includes('天氣') || userMessage.includes('宜蘭')) {
    try {
      const weatherData = await getCurrentWeather();
      const replyText = weatherData || '無法取得天氣資料';
      const limitedText = replyText.length > 5000 ? replyText.substring(0, 5000) + '...' : replyText;
      return client.replyMessage(event.replyToken, { type: 'text', text: limitedText });
    } catch (error) {
      console.error('取得天氣資料錯誤:', error);
      return client.replyMessage(event.replyToken, { type: 'text', text: '⚠️ 取得天氣資料時發生錯誤' });
    }
  }

  // 預設回應
  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: '請輸入指令查詢資訊：\n\n🌤️ 「天氣」或「宜蘭」查詢天氣\n🍳 「早餐」查詢礁溪早餐店\n🍱 「午餐」查詢礁溪午餐店\n🔍 「早餐 鄉村堡」搜尋早餐特定店家\n🔍 「午餐 甕窯雞」搜尋午餐特定店家\n🛠️ 「!debug」查看API除錯資訊'
  });
}

// ==================== 伺服器設定 ====================

app.post('/webhook', line.middleware(lineConfig), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error('Webhook 錯誤:', err);
      res.status(200).end();
    });
});

app.listen(PORT, () => {
  console.log(`天氣機器人正在連接埠 ${PORT} 上運行`);
  console.log(`Webhook URL: https://line-bot-agjf.onrender.com/webhook`);
  console.log(`早餐店資料庫已載入，共 ${breakfastData.getBreakfastShopsCount()} 間店家`);
  console.log(`午餐店資料庫已載入，共 ${lunchData.getLunchShopsCount()} 間店家`);
});

module.exports = app;
