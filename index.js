const express = require('express');
const axios = require('axios');
const line = require('@line/bot-sdk');

// 導入資料
const jiaoxiBreakfastData = require('./data/Jiaoxi/breakfastShops');
const jiaoxiLunchData = require('./data/Jiaoxi/lunchShops');
const jiaoxiDinnerData = require('./data/Jiaoxi/dinnerShops');
const familyEnvironmentData = require('./data/Jiaoxi/familyEnvironment');

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

// 儲存使用者的查詢狀態（用於分頁）
const userSessions = new Map();

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

  if (typeof elementValue === 'string' || typeof elementValue === 'number') {
    return elementValue;
  }

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

  let startHour = currentHour;
  let dayMark = "";

  if (currentMinute < 30) {
    startHour = currentHour + 1;
  } else {
    startHour = currentHour + 2;
  }

  if (startHour >= 24) {
    startHour -= 24;
    dayMark = " (明日)";
  }

  for (let i = 0; i < 5; i++) {
    const slotStartHour = (startHour + (i * 2)) % 24;
    const slotEndHour = (slotStartHour + 2) % 24;
    const startTimeStr = `${String(slotStartHour).padStart(2, '0')}:00`;
    const endTimeStr = `${String(slotEndHour).padStart(2, '0')}:00`;

    let slotDayMark = dayMark;
    if (i > 0 && dayMark) {
      slotDayMark = " (明日)";
    } else if (slotEndHour < slotStartHour) {
      slotDayMark = " (跨日)";
    }

    slots.push({
      start: startTimeStr,
      end: endTimeStr,
      dayMark: slotDayMark
    });
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
    
    if (!response.data.records || !response.data.records.Locations) {
      return null;
    }

    const locationsList = response.data.records.Locations;
    if (!locationsList || locationsList.length === 0) return null;

    const firstLocations = locationsList[0];
    const locationArray = firstLocations.Location;
    if (!locationArray || locationArray.length === 0) return null;

    const jiaoxiData = locationArray.find(l => l.LocationName === '礁溪鄉');
    if (!jiaoxiData) return null;

    const weatherElements = jiaoxiData.WeatherElement || [];
    const tempData = weatherElements.find(e => e.ElementName === '溫度')?.Time || [];

    if (tempData.length === 0) return null;

    const now = new Date();
    const twTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    const currentHour = twTime.getHours();
    const currentMinute = twTime.getMinutes();
    const currentDate = `${String(twTime.getMonth() + 1).padStart(2, '0')}/${String(twTime.getDate()).padStart(2, '0')}`;
    
    let startHour = currentHour;
    let startDay = 0;

    if (currentMinute < 30) {
      startHour = currentHour + 1;
    } else {
      startHour = currentHour + 2;
    }

    if (startHour >= 24) {
      startHour -= 24;
      startDay = 1;
    }

    let tempText = "";
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

          let isFuture = false;
          if (dayDiff === startDay) {
            isFuture = itemHour >= startHour;
          } else if (dayDiff > startDay) {
            isFuture = true;
          }

          if (isFuture) {
            const endHour = (itemHour + 2) % 24;
            const startTimeStr = `${String(itemHour).padStart(2, '0')}:00`;
            const endTimeStr = `${String(endHour).padStart(2, '0')}:00`;

            let dayMark = "";
            if (dayDiff === 1) dayMark = " (明日)";
            else if (dayDiff > 1) dayMark = ` (+${dayDiff})`;

            const temp = getElementValue(tempItem.ElementValue);
            if (temp) {
              tempText += `${startTimeStr}-${endTimeStr}${dayMark} ${temp}°\n`;
              foundCount++;
            }
          }
        } catch (e) {
          console.log('解析時間錯誤:', e.message);
        }
      }
    }

    return tempText || null;
    
  } catch (error) {
    console.log("小時溫度預報錯誤：", error.message);
    return null;
  }
}

async function getDailyForecast() {
  try {
    const response = await axios.get(
      `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-001?Authorization=${CWA_API_KEY}&locationName=礁溪鄉`
    );

    if (!response.data.records || !response.data.records.Locations) return "";

    const locationsList = response.data.records.Locations;
    if (!locationsList || locationsList.length === 0) return "";

    const firstLocations = locationsList[0];
    const locationArray = firstLocations.Location;
    if (!locationArray || locationArray.length === 0) return "";

    const jiaoxiData = locationArray.find(l => l.LocationName === '礁溪鄉');
    if (!jiaoxiData) return "";

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
        if (!timeStr) return false;
        const itemDate = timeStr.substring(5, 10).replace('-', '/');
        return itemDate === targetDate;
      });

      const tempItems = tempData.filter(item => {
        const timeStr = getTimeString(item);
        if (!timeStr) return false;
        const itemDate = timeStr.substring(5, 10).replace('-', '/');
        return itemDate === targetDate;
      });

      const popItems = popData.filter(item => {
        const timeStr = getTimeString(item);
        if (!timeStr) return false;
        const itemDate = timeStr.substring(5, 10).replace('-', '/');
        return itemDate === targetDate;
      });

      const weather = getElementValue(wx?.ElementValue) || '';

      const temps = tempItems
        .map(item => {
          const val = getElementValue(item.ElementValue);
          return val ? parseFloat(val) : null;
        })
        .filter(t => t !== null);

      const minTemp = temps.length > 0 ? Math.min(...temps) : null;
      const maxTemp = temps.length > 0 ? Math.max(...temps) : null;

      const pops = popItems
        .map(item => {
          const val = getElementValue(item.ElementValue);
          return val ? parseFloat(val) : null;
        })
        .filter(p => p !== null && p > 0);

      const maxPop = pops.length > 0 ? Math.max(...pops) : null;

      let dayText = targetDate;
      if (i === 0) dayText += " (今日)";

      if (weather) dayText += ` ${weather}`;

      if (minTemp !== null && maxTemp !== null) {
        if (minTemp === maxTemp) dayText += ` ${minTemp}°`;
        else dayText += ` ${minTemp}°~${maxTemp}°`;
      } else if (minTemp !== null) dayText += ` ${minTemp}°`;
      else if (maxTemp !== null) dayText += ` ${maxTemp}°`;

      if (maxPop !== null) dayText += ` ☔${maxPop}%`;

      forecast.push(dayText);
    }

    return forecast.join('\n');
    
  } catch (error) {
    console.log("每日預報錯誤：", error.message);
    return "";
  }
}

async function getCurrentWeather() {
  try {
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
      result += `\n🕒 未來10小時溫度\n`;
      result += hourlyTemp;
    } else {
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
        if (avgTemp !== null) slotText += ` ${avgTemp}°`;
        result += slotText + '\n';
      }
    }

    if (dailyForecast) {
      result += `\n📅 今日+未來3天\n`;
      result += dailyForecast;
    }

    result += `\n━━━━━━━━━━━━\n資料來源：中央氣象署`;
    
    return result;
    
  } catch (error) {
    console.log("錯誤內容：", error.response?.data || error.message);
    return "⚠️ 無法取得天氣資料，請稍後再試";
  }
}

async function getDebugInfo() {
  try {
    let debugText = "🔍 API 除錯資訊\n\n";
    debugText += "📡 F-D0047-001 (礁溪鄉):\n";

    try {
      const response = await axios.get(
        `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-001?Authorization=${CWA_API_KEY}&locationName=礁溪鄉`
      );
      
      debugText += `狀態: ${response.data.success}\n`;

      if (response.data.records && response.data.records.Locations) {
        const locations = response.data.records.Locations;
        debugText += `Locations 長度: ${locations.length}\n`;

        if (locations.length > 0) {
          const firstLoc = locations[0];
          if (firstLoc.Location) {
            debugText += `Location 長度: ${firstLoc.Location.length}\n`;
            
            const jiaoxi = firstLoc.Location.find(l => l.LocationName === '礁溪鄉');
            if (jiaoxi) {
              debugText += `✅ 找到礁溪鄉！\n`;
              
              if (jiaoxi.WeatherElement) {
                const elements = jiaoxi.WeatherElement.map(e => e.ElementName).join(', ');
                debugText += `可用元素: ${elements}\n`;
              }
            }
          }
        }
      }
    } catch (e) {
      debugText += `❌ 失敗: ${e.message}\n`;
    }

    debugText += `\n🍳 礁溪早餐店資料庫\n`;
    debugText += `店家總數: ${jiaoxiBreakfastData.getJiaoxiBreakfastShopsCount()} 間\n`;

    debugText += `\n🍱 礁溪午餐店資料庫\n`;
    debugText += `店家總數: ${jiaoxiLunchData.getJiaoxiLunchShopsCount()} 間\n`;

    debugText += `\n🍽️ 礁溪晚餐店資料庫\n`;
    debugText += `店家總數: ${jiaoxiDinnerData.getJiaoxiDinnerShopsCount()} 間\n`;

    debugText += `\n👨‍👩‍👧‍👦 礁溪親子環境資料庫\n`;
    debugText += `總地點數: ${familyEnvironmentData.getTotalCount()} 個\n`;
    debugText += `🏞️ 景點: ${familyEnvironmentData.getAttractionsCount()} 個\n`;
    debugText += `🍽️ 餐廳: ${familyEnvironmentData.getRestaurantsCount()} 間\n`;

    if (debugText.length > 4900) {
      debugText = debugText.substring(0, 4900) + '...';
    }
    
    return debugText;
    
  } catch (error) {
    return `除錯失敗: ${error.message}`;
  }
}

// ==================== 分頁輔助函數 ====================

function formatShopMessageWithPagination(shops, page, typeName, region = '礁溪') {
  const itemsPerPage = 30;
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageShops = shops.slice(startIndex, endIndex);
  const totalPages = Math.ceil(shops.length / itemsPerPage);
  
  let emoji = '🍳';
  if (typeName === '早餐') emoji = '🍳';
  else if (typeName === '午餐') emoji = '🍱';
  else if (typeName === '晚餐') emoji = '🍽️';
  else if (typeName === '親子環境') emoji = '👨‍👩‍👧‍👦';
  
  let message = `${emoji} ${region}${typeName}列表 (第${page}/${totalPages}頁)\n`;
  message += '━━━━━━━━━━━━\n\n';
  
  pageShops.forEach((shop, index) => {
    const globalIndex = startIndex + index + 1;
    if (shop.subcategory) {
      const subEmoji = familyEnvironmentData.getSubcategoryEmoji(shop.subcategory);
      message += `${globalIndex}. ${shop.name}\n`;
      message += `   ${subEmoji} ${shop.subcategory}\n`;
    } else {
      message += `${globalIndex}. ${shop.name}\n`;
    }
  });
  
  message += `\n📝 顯示 ${startIndex + 1}-${Math.min(endIndex, shops.length)} / 共 ${shops.length} 個地點\n`;
  message += '━━━━━━━━━━━━\n';
  
  if (totalPages > 1) {
    if (page > 1 && page < totalPages) {
      message += `📖 輸入「上一頁」或「下一頁」切換\n`;
    } else if (page === 1 && totalPages > 1) {
      message += `📖 輸入「下一頁」查看更多\n`;
    } else if (page === totalPages && totalPages > 1) {
      message += `📖 輸入「上一頁」返回\n`;
    }
  }
  
  message += `💡 輸入「${region}${typeName}」查看所有${typeName}\n`;
  message += `🔍 或直接輸入名稱搜尋`;
  
  return message;
}

function createShopDetailFlexMessage(shop, typeName) {
  let emoji = '🍳';
  if (typeName === '早餐') emoji = '🍳';
  else if (typeName === '午餐') emoji = '🍱';
  else if (typeName === '晚餐') emoji = '🍽️';
  else if (typeName === '親子環境') emoji = '👨‍👩‍👧‍👦';
  
  const query = encodeURIComponent(`${shop.name} ${shop.address}`);
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
  
  const bodyContents = [
    {
      type: 'text',
      text: `${emoji} ${shop.name}`,
      weight: 'bold',
      size: 'xl',
      wrap: true
    },
    {
      type: 'box',
      layout: 'vertical',
      margin: 'md',
      spacing: 'sm',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            { type: 'text', text: '📍', size: 'md', flex: 0 },
            { type: 'text', text: shop.address, size: 'sm', wrap: true, flex: 1 }
          ]
        },
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            { type: 'text', text: '🕐', size: 'md', flex: 0 },
            { type: 'text', text: shop.hours, size: 'sm', wrap: true, flex: 1 }
          ]
        }
      ]
    }
  ];
  
  if (shop.category) {
    const categoryEmoji = shop.category === '景點' ? '🏞️' : '🍽️';
    const subEmoji = shop.subcategory ? familyEnvironmentData.getSubcategoryEmoji(shop.subcategory) : '';
    bodyContents[1].contents.unshift({
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: '📂', size: 'md', flex: 0 },
        { type: 'text', text: `${categoryEmoji} ${shop.category} ${subEmoji}${shop.subcategory || ''}`, size: 'sm', wrap: true, flex: 1 }
      ]
    });
  }
  
  if (shop.phone && shop.phone !== '') {
    bodyContents[1].contents.push({
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: '📞', size: 'md', flex: 0 },
        { type: 'text', text: shop.phone, size: 'sm', wrap: true, flex: 1 }
      ]
    });
  }
  
  const footerContents = [
    {
      type: 'button',
      style: 'secondary',
      height: 'sm',
      action: {
        type: 'uri',
        label: '📋 查看完整店家資訊',
        uri: mapUrl
      }
    }
  ];
  
  const flexMessage = {
    type: 'flex',
    altText: `${shop.name} - ${typeName}資訊`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: bodyContents
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: footerContents
      }
    }
  };
  
  if (shop.imageUrl) {
    flexMessage.contents.hero = {
      type: 'image',
      url: shop.imageUrl,
      size: 'full',
      aspectRatio: '20:13',
      aspectMode: 'cover'
    };
  }
  
  return flexMessage;
}

// ==================== 查詢處理函數 ====================

async function handleJiaoxiBreakfastQuery(userMessage, replyToken, userId) {
  if (userMessage === '礁溪早餐') {
    const allShops = jiaoxiBreakfastData.getAllJiaoxiBreakfastShops();
    
    userSessions.set(userId, {
      type: 'breakfast',
      region: '礁溪',
      shops: allShops,
      page: 1
    });
    
    const textMessage = formatShopMessageWithPagination(allShops, 1, '早餐', '礁溪');
    return client.replyMessage(replyToken, { type: 'text', text: textMessage });
  }
  return null;
}

async function handleJiaoxiLunchQuery(userMessage, replyToken, userId) {
  if (userMessage === '礁溪午餐') {
    const allShops = jiaoxiLunchData.getAllJiaoxiLunchShops();
    
    userSessions.set(userId, {
      type: 'lunch',
      region: '礁溪',
      shops: allShops,
      page: 1
    });
    
    const textMessage = formatShopMessageWithPagination(allShops, 1, '午餐', '礁溪');
    return client.replyMessage(replyToken, { type: 'text', text: textMessage });
  }
  return null;
}

async function handleJiaoxiDinnerQuery(userMessage, replyToken, userId) {
  if (userMessage === '礁溪晚餐') {
    const allShops = jiaoxiDinnerData.getAllJiaoxiDinnerShops();
    
    userSessions.set(userId, {
      type: 'dinner',
      region: '礁溪',
      shops: allShops,
      page: 1
    });
    
    const textMessage = formatShopMessageWithPagination(allShops, 1, '晚餐', '礁溪');
    return client.replyMessage(replyToken, { type: 'text', text: textMessage });
  }
  return null;
}

async function handleFamilyEnvironmentQuery(userMessage, replyToken, userId) {
  // 處理「親子環境」主查詢
  if (userMessage === '親子環境') {
    const allPlaces = familyEnvironmentData.getAllFamilyEnvironment();
    
    userSessions.set(userId, {
      type: 'familyEnvironment',
      region: '礁溪',
      shops: allPlaces,
      page: 1
    });
    
    const textMessage = formatShopMessageWithPagination(allPlaces, 1, '親子環境', '礁溪');
    return client.replyMessage(replyToken, { type: 'text', text: textMessage });
  }
  
  // 處理「親子環境 景點」- 只看景點
  if (userMessage === '親子環境 景點') {
    const attractions = familyEnvironmentData.getAttractions();
    
    userSessions.set(userId, {
      type: 'familyEnvironmentAttractions',
      region: '礁溪',
      shops: attractions,
      page: 1
    });
    
    const textMessage = formatShopMessageWithPagination(attractions, 1, '親子環境-景點', '礁溪');
    return client.replyMessage(replyToken, { type: 'text', text: textMessage });
  }
  
  // 處理「親子環境 餐廳」- 只看餐廳
  if (userMessage === '親子環境 餐廳') {
    const restaurants = familyEnvironmentData.getRestaurants();
    
    userSessions.set(userId, {
      type: 'familyEnvironmentRestaurants',
      region: '礁溪',
      shops: restaurants,
      page: 1
    });
    
    const textMessage = formatShopMessageWithPagination(restaurants, 1, '親子環境-餐廳', '礁溪');
    return client.replyMessage(replyToken, { type: 'text', text: textMessage });
  }
  
  // 處理依子分類篩選（例如：親子環境 公園、親子環境 親子餐廳）
  if (userMessage.startsWith('親子環境 ')) {
    const subcategory = userMessage.substring(5); // 去掉「親子環境 」
    const filtered = familyEnvironmentData.searchBySubcategory(subcategory);
    
    if (filtered.length > 0) {
      userSessions.set(userId, {
        type: 'familyEnvironmentFiltered',
        region: '礁溪',
        shops: filtered,
        page: 1,
        filter: subcategory
      });
      
      const textMessage = formatShopMessageWithPagination(filtered, 1, `親子環境-${subcategory}`, '礁溪');
      return client.replyMessage(replyToken, { type: 'text', text: textMessage });
    } else {
      return client.replyMessage(replyToken, {
        type: 'text',
        text: `🔍 找不到「${subcategory}」分類的親子環境地點\n\n💡 可用的分類：\n🏞️ 景點分類：公園、體驗館、休閒農場、釣蝦場、生態館、親子館、觀光工廠\n🍽️ 餐廳分類：親子餐廳、咖啡廳、海鮮餐廳、中式餐廳、泰式餐廳、寵物餐廳、快炒、景觀餐廳`
      });
    }
  }
  
  return null;
}

async function handleShopSearch(userMessage, replyToken, userId) {
  // 先搜尋早餐店
  let results = jiaoxiBreakfastData.searchJiaoxiBreakfastShops(userMessage);
  let shopType = 'breakfast';
  let typeName = '早餐';
  
  if (results.length === 0) {
    results = jiaoxiLunchData.searchJiaoxiLunchShops(userMessage);
    shopType = 'lunch';
    typeName = '午餐';
  }
  
  if (results.length === 0) {
    results = jiaoxiDinnerData.searchJiaoxiDinnerShops(userMessage);
    shopType = 'dinner';
    typeName = '晚餐';
  }
  
  // 如果早餐、午餐、晚餐都沒找到，搜尋親子環境
  if (results.length === 0) {
    results = familyEnvironmentData.searchFamilyEnvironment(userMessage);
    shopType = 'familyEnvironment';
    typeName = '親子環境';
  }
  
  if (results.length === 0) {
    return client.replyMessage(replyToken, {
      type: 'text',
      text: `🔍 找不到「${userMessage}」相關的地點\n\n💡 提示：\n• 輸入「礁溪早餐」查看所有早餐店\n• 輸入「礁溪午餐」查看所有午餐店\n• 輸入「礁溪晚餐」查看所有晚餐店\n• 輸入「親子環境」查看所有親子景點與餐廳\n• 輸入「親子環境 景點」只看景點\n• 輸入「親子環境 餐廳」只看餐廳\n• 輸入「親子環境 公園」依分類篩選\n• 或直接輸入名稱搜尋`
    });
  }
  
  if (results.length === 1) {
    const shop = results[0];
    const flexMessage = createShopDetailFlexMessage(shop, typeName);
    return client.replyMessage(replyToken, flexMessage);
  }
  
  userSessions.set(userId, {
    type: shopType,
    region: '礁溪',
    shops: results,
    page: 1
  });
  
  const textMessage = formatShopMessageWithPagination(results, 1, typeName, '礁溪');
  return client.replyMessage(replyToken, { type: 'text', text: textMessage });
}

async function handlePagination(userMessage, replyToken, userId) {
  const session = userSessions.get(userId);
  if (!session || !session.shops) {
    return client.replyMessage(replyToken, {
      type: 'text',
      text: '🔍 請先輸入「礁溪早餐」、「礁溪午餐」、「礁溪晚餐」或「親子環境」開始查詢，或直接輸入名稱搜尋'
    });
  }
  
  const { type, region, shops, page } = session;
  let typeName = '';
  if (type === 'breakfast') typeName = '早餐';
  else if (type === 'lunch') typeName = '午餐';
  else if (type === 'dinner') typeName = '晚餐';
  else if (type === 'familyEnvironment') typeName = '親子環境';
  else if (type === 'familyEnvironmentAttractions') typeName = '親子環境-景點';
  else if (type === 'familyEnvironmentRestaurants') typeName = '親子環境-餐廳';
  else if (type === 'familyEnvironmentFiltered') typeName = `親子環境-${session.filter || ''}`;
  else typeName = '查詢結果';
  
  const totalPages = Math.ceil(shops.length / 30);
  
  if (userMessage === '下一頁') {
    const nextPage = page + 1;
    if (nextPage <= totalPages) {
      session.page = nextPage;
      userSessions.set(userId, session);
      const textMessage = formatShopMessageWithPagination(shops, nextPage, typeName, region);
      return client.replyMessage(replyToken, { type: 'text', text: textMessage });
    } else {
      return client.replyMessage(replyToken, {
        type: 'text',
        text: `📄 已經是最後一頁了！\n\n💡 輸入「${region}${typeName.replace('-', '')}」重新查看`
      });
    }
  }
  
  if (userMessage === '上一頁') {
    const prevPage = page - 1;
    if (prevPage >= 1) {
      session.page = prevPage;
      userSessions.set(userId, session);
      const textMessage = formatShopMessageWithPagination(shops, prevPage, typeName, region);
      return client.replyMessage(replyToken, { type: 'text', text: textMessage });
    } else {
      return client.replyMessage(replyToken, {
        type: 'text',
        text: `📄 已經是第一頁了！\n\n💡 輸入「下一頁」查看更多`
      });
    }
  }
  
  return null;
}

// ==================== Line Bot 事件處理 ====================

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userMessage = event.message.text;
  const userId = event.source.userId;

  if (userMessage === '!debug') {
    const debugInfo = await getDebugInfo();
    return client.replyMessage(event.replyToken, { type: 'text', text: debugInfo });
  }

  if (userMessage === '下一頁' || userMessage === '上一頁') {
    await handlePagination(userMessage, event.replyToken, userId);
    return;
  }

  if (userMessage === '礁溪早餐') {
    await handleJiaoxiBreakfastQuery(userMessage, event.replyToken, userId);
    return;
  }

  if (userMessage === '礁溪午餐') {
    await handleJiaoxiLunchQuery(userMessage, event.replyToken, userId);
    return;
  }
  
  if (userMessage === '礁溪晚餐') {
    await handleJiaoxiDinnerQuery(userMessage, event.replyToken, userId);
    return;
  }

  // 親子環境查詢（包含各種篩選條件）
  if (userMessage.startsWith('親子環境')) {
    await handleFamilyEnvironmentQuery(userMessage, event.replyToken, userId);
    return;
  }

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

  const excludeKeywords = ['天氣', '宜蘭', '早餐', '午餐', '晚餐', '親子環境', '下一頁', '上一頁', '!debug'];
  const isExcluded = excludeKeywords.some(keyword => userMessage.includes(keyword));
  
  if (!isExcluded && userMessage.trim().length > 0) {
    await handleShopSearch(userMessage, event.replyToken, userId);
    return;
  }

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: '請輸入指令查詢資訊：\n\n🌤️ 「天氣」或「宜蘭」查詢天氣\n🍳 「礁溪早餐」查詢礁溪早餐店\n🍱 「礁溪午餐」查詢礁溪午餐店\n🍽️ 「礁溪晚餐」查詢礁溪晚餐店\n👨‍👩‍👧‍👦 「親子環境」查詢親子景點與餐廳\n\n📖 分頁功能：查看列表後輸入「下一頁」或「上一頁」\n\n🔍 直接輸入名稱搜尋：\n   例如：酷克伊早餐、甲鳥園、水鹿咖啡\n\n🔍 親子環境篩選：\n   「親子環境 景點」只看景點\n   「親子環境 餐廳」只看餐廳\n   「親子環境 公園」依分類篩選\n🛠️ 「!debug」查看API除錯資訊'
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
  console.log(`礁溪早餐店資料庫已載入，共 ${jiaoxiBreakfastData.getJiaoxiBreakfastShopsCount()} 間店家`);
  console.log(`礁溪午餐店資料庫已載入，共 ${jiaoxiLunchData.getJiaoxiLunchShopsCount()} 間店家`);
  console.log(`礁溪晚餐店資料庫已載入，共 ${jiaoxiDinnerData.getJiaoxiDinnerShopsCount()} 間店家`);
  console.log(`礁溪親子環境資料庫已載入，共 ${familyEnvironmentData.getTotalCount()} 個地點（景點 ${familyEnvironmentData.getAttractionsCount()} 個，餐廳 ${familyEnvironmentData.getRestaurantsCount()} 間）`);
});

module.exports = app;
