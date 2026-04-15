const express = require('express');
const axios = require('axios');
const line = require('@line/bot-sdk');

// 導入資料 - 新的路徑結構
const jiaoxiBreakfastData = require('./data/Jiaoxi/breakfastShops');
const jiaoxiLunchData = require('./data/Jiaoxi/lunchShops');
const jiaoxiDinnerData = require('./data/Jiaoxi/dinnerShops');

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
const userSessions = new Map(); // key: userId, value: { type, region, shops, page }

// ==================== 工具函數 ====================

/**
 * 安全地取得數值
 */
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

/**
 * 安全地取得時間
 */
function getTimeString(timeObj) {
  if (!timeObj) return null;
  return timeObj.DataTime || timeObj.dataTime || timeObj.StartTime || timeObj.startTime || null;
}

/**
 * 獲取今天 + 未來3天的日期（格式：MM/DD）
 */
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

/**
 * 生成2小時間隔的時間區間（備用方案）
 */
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

/**
 * 從 F-D0047-001 API 獲取2小時間隔的溫度預報（礁溪鄉）
 */
async function getHourlyTemperature() {
  try {
    console.log('開始取得小時溫度預報（F-D0047-001 礁溪鄉）...');
    
    const response = await axios.get(
      `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-001?Authorization=${CWA_API_KEY}&locationName=礁溪鄉`
    );
    
    console.log('API 回應狀態:', response.data.success);

    if (!response.data.records || !response.data.records.Locations) {
      console.log('找不到 records.Locations');
      return null;
    }

    const locationsList = response.data.records.Locations;
    if (!locationsList || locationsList.length === 0) {
      return null;
    }

    const firstLocations = locationsList[0];
    const locationArray = firstLocations.Location;
    if (!locationArray || locationArray.length === 0) {
      return null;
    }

    const jiaoxiData = locationArray.find(l => l.LocationName === '礁溪鄉');
    if (!jiaoxiData) {
      console.log('找不到礁溪鄉');
      return null;
    }

    console.log('使用地點:', jiaoxiData.LocationName);

    const weatherElements = jiaoxiData.WeatherElement || [];
    const tempData = weatherElements.find(e => e.ElementName === '溫度')?.Time || [];
    console.log(`找到溫度資料筆數: ${tempData.length}`);

    if (tempData.length === 0) {
      console.log('沒有溫度資料');
      return null;
    }

    // 獲取當前時間
    const now = new Date();
    const twTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    const currentHour = twTime.getHours();
    const currentMinute = twTime.getMinutes();
    const currentDate = `${String(twTime.getMonth() + 1).padStart(2, '0')}/${String(twTime.getDate()).padStart(2, '0')}`;
    
    console.log(`當前時間: ${currentHour}:${currentMinute}, 日期: ${currentDate}`);

    // 決定起始時間
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

    console.log(`起始小時: ${startHour}, 起始日: ${startDay === 0 ? '今天' : '明天'}`);

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
            if (dayDiff === 1) {
              dayMark = " (明日)";
            } else if (dayDiff > 1) {
              dayMark = ` (+${dayDiff})`;
            }

            const temp = getElementValue(tempItem.ElementValue);
            if (temp) {
              let tempSlot = `${startTimeStr}-${endTimeStr}${dayMark} ${temp}°`;
              tempText += tempSlot + '\n';
              foundCount++;
            }
          }
        } catch (e) {
          console.log('解析時間錯誤:', e.message);
        }
      }
    }

    console.log(`總共找到 ${foundCount} 筆溫度資料`);
    return tempText || null;
    
  } catch (error) {
    console.log("小時溫度預報錯誤：", error.message);
    return null;
  }
}

/**
 * 從 F-D0047-001 API 獲取今天 + 未來3天預報（礁溪鄉）
 */
async function getDailyForecast() {
  try {
    const response = await axios.get(
      `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-001?Authorization=${CWA_API_KEY}&locationName=礁溪鄉`
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

    const jiaoxiData = locationArray.find(l => l.LocationName === '礁溪鄉');
    if (!jiaoxiData) {
      return "";
    }

    const weatherElements = jiaoxiData.WeatherElement || [];
    const wxData = weatherElements.find(e => e.ElementName === '天氣現象')?.Time || [];
    const tempData = weatherElements.find(e => e.ElementName === '溫度')?.Time || [];
    const popData = weatherElements.find(e => e.ElementName === '3小時降雨機率')?.Time || [];

    // 除錯：顯示所有可用的日期
    const availableDates = [...new Set(tempData.map(item => {
      const timeStr = getTimeString(item);
      return timeStr ? timeStr.substring(5, 10).replace('-', '/') : null;
    }).filter(d => d))];
    
    console.log('可用溫度日期:', availableDates.sort().join(', '));

    // 取得今天 + 未來3天
    const dates = getDates();
    let forecast = [];

    for (let i = 0; i < dates.length; i++) {
      const targetDate = dates[i];

      // 找當天的天氣現象（取中午左右的資料，較有代表性）
      const wx = wxData.find(item => {
        const timeStr = getTimeString(item);
        if (!timeStr) return false;
        const itemDate = timeStr.substring(5, 10).replace('-', '/');
        const itemHour = parseInt(timeStr.substring(11, 13));
        return itemDate === targetDate && itemHour >= 10 && itemHour <= 14;
      }) || wxData.find(item => {
        // 如果找不到中午的，就取第一筆
        const timeStr = getTimeString(item);
        if (!timeStr) return false;
        const itemDate = timeStr.substring(5, 10).replace('-', '/');
        return itemDate === targetDate;
      });

      // 找當天的溫度資料
      const tempItems = tempData.filter(item => {
        const timeStr = getTimeString(item);
        if (!timeStr) return false;
        const itemDate = timeStr.substring(5, 10).replace('-', '/');
        return itemDate === targetDate;
      });

      // 找當天的降雨機率資料
      const popItems = popData.filter(item => {
        const timeStr = getTimeString(item);
        if (!timeStr) return false;
        const itemDate = timeStr.substring(5, 10).replace('-', '/');
        return itemDate === targetDate;
      });

      console.log(`${targetDate}: 找到 ${tempItems.length} 筆溫度, ${popItems.length} 筆降雨`);

      const weather = getElementValue(wx?.ElementValue) || '';

      // 計算最低溫和最高溫
      const temps = tempItems
        .map(item => {
          const val = getElementValue(item.ElementValue);
          return val ? parseFloat(val) : null;
        })
        .filter(t => t !== null);

      const minTemp = temps.length > 0 ? Math.min(...temps) : null;
      const maxTemp = temps.length > 0 ? Math.max(...temps) : null;

      if (temps.length > 0) {
        console.log(`${targetDate} 溫度範圍: ${minTemp}~${maxTemp} (共${temps.length}筆)`);
      }

      // 計算最高降雨機率
      const pops = popItems
        .map(item => {
          const val = getElementValue(item.ElementValue);
          return val ? parseFloat(val) : null;
        })
        .filter(p => p !== null && p > 0);

      const maxPop = pops.length > 0 ? Math.max(...pops) : null;

      // 今天加上「今日」標記
      let dayText = targetDate;
      if (i === 0) {
        dayText += " (今日)";
      }

      if (weather) dayText += ` ${weather}`;

      // 顯示最低溫~最高溫
      if (minTemp !== null && maxTemp !== null) {
        if (minTemp === maxTemp) {
          dayText += ` ${minTemp}°`;
        } else {
          dayText += ` ${minTemp}°~${maxTemp}°`;
        }
      } else if (minTemp !== null) {
        dayText += ` ${minTemp}°`;
      } else if (maxTemp !== null) {
        dayText += ` ${maxTemp}°`;
      }

      if (maxPop !== null) {
        dayText += ` ☔${maxPop}%`;
      }

      forecast.push(dayText);
    }

    return forecast.join('\n');
    
  } catch (error) {
    console.log("每日預報錯誤：", error.message);
    return "";
  }
}

/**
 * 取得主要天氣資訊
 */
async function getCurrentWeather() {
  try {
    // ===== 36小時預報（用於目前天氣和降雨）=====
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

    // ===== 從 F-D0047-001 獲取小時溫度預報（礁溪鄉）=====
    const hourlyTemp = await getHourlyTemperature();

    // ===== 從 F-D0047-001 獲取今日 + 未來3天預報（礁溪鄉）=====
    const dailyForecast = await getDailyForecast();

    // 獲取今天的日期顯示
    const today = new Date();
    const twTime = new Date(today.getTime() + (8 * 60 * 60 * 1000));
    const todayStr = `${twTime.getFullYear()}/${String(twTime.getMonth() + 1).padStart(2, '0')}/${String(twTime.getDate()).padStart(2, '0')}`;
    const currentTimeStr = `${String(twTime.getHours()).padStart(2, '0')}:${String(twTime.getMinutes()).padStart(2, '0')}`;

    let result = `📍 礁溪鄉 (${todayStr} ${currentTimeStr})\n`;
    result += `━━━━━━━━━━━━\n\n`;
    result += `🌡 目前溫度 ${currentAvgTemp}°`;
    
    if (currentPop && currentPop !== '--') {
      result += `  ☔${currentPop}%`;
    }
    
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
        if (avgTemp !== null) {
          slotText += ` ${avgTemp}°`;
        }
        result += slotText + '\n';
      }
    }

    if (dailyForecast) {
      result += `\n📅 今日+未來3天\n`;
      result += dailyForecast;
    }

    result += `\n━━━━━━━━━━━━\n資料來源：中央氣象署 (F-D0047-001)`;
    
    return result;
    
  } catch (error) {
    console.log("錯誤內容：", error.response?.data || error.message);
    return "⚠️ 無法取得天氣資料，請稍後再試";
  }
}

/**
 * 取得除錯資訊
 */
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
                
                const temp = jiaoxi.WeatherElement.find(e => e.ElementName === '溫度');
                if (temp && temp.Time) {
                  debugText += `溫度筆數: ${temp.Time.length}\n`;
                  
                  // 顯示可用日期
                  const dates = [...new Set(temp.Time.map(t => {
                    const timeStr = getTimeString(t);
                    return timeStr ? timeStr.substring(5, 10).replace('-', '/') : null;
                  }).filter(d => d))];
                  
                  debugText += `可用日期: ${dates.sort().join(', ')}\n`;
                }
              }
            }
          }
        }
      }
    } catch (e) {
      debugText += `❌ 失敗: ${e.message}\n`;
    }

    // 加入礁溪早餐店統計資訊
    debugText += `\n🍳 礁溪早餐店資料庫\n`;
    debugText += `店家總數: ${jiaoxiBreakfastData.getJiaoxiBreakfastShopsCount()} 間\n`;

    // 加入礁溪午餐店統計資訊
    debugText += `\n🍱 礁溪午餐店資料庫\n`;
    debugText += `店家總數: ${jiaoxiLunchData.getJiaoxiLunchShopsCount()} 間\n`;

    // 加入礁溪晚餐店統計資訊
    debugText += `\n🍽️ 礁溪晚餐店資料庫\n`;
    debugText += `店家總數: ${jiaoxiDinnerData.getJiaoxiDinnerShopsCount()} 間\n`;

    if (debugText.length > 4900) {
      debugText = debugText.substring(0, 4900) + '...';
    }
    
    return debugText;
    
  } catch (error) {
    return `除錯失敗: ${error.message}`;
  }
}

// ==================== 分頁輔助函數 ====================

/**
 * 格式化店家訊息（支援分頁）
 */
function formatShopMessageWithPagination(shops, page, mealType, region = '礁溪') {
  const itemsPerPage = 30;
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageShops = shops.slice(startIndex, endIndex);
  const totalPages = Math.ceil(shops.length / itemsPerPage);
  
  const emoji = mealType === '早餐' ? '🍳' : (mealType === '午餐' ? '🍱' : '🍽️');
  
  let message = `${emoji} ${region}${mealType}店列表 (第${page}/${totalPages}頁)\n`;
  message += '━━━━━━━━━━━━\n\n';
  
  pageShops.forEach((shop, index) => {
    const globalIndex = startIndex + index + 1;
    message += `${globalIndex}. ${shop.name}\n`;
  });
  
  message += `\n📝 顯示 ${startIndex + 1}-${Math.min(endIndex, shops.length)} / 共 ${shops.length} 間店家\n`;
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
  
  message += `💡 輸入「${region}${mealType}」查看所有店家\n`;
  message += `🔍 或直接輸入店名搜尋（例如：酷克伊早餐）`;
  
  return message;
}

/**
 * 建立店家詳細資訊的 Flex Message（點擊按鈕直接開啟 Google Maps 導航）
 */
function createShopDetailFlexMessage(shop, mealType) {
  const emoji = mealType === '早餐' ? '🍳' : (mealType === '午餐' ? '🍱' : '🍽️');
  
  // 將地址轉換為 Google Maps 導航連結（使用 encodeURIComponent 確保中文正常）
  const encodedAddress = encodeURIComponent(shop.address);
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
  
  // 建立 body 內容
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
  
  // 如果有電話，加入電話欄位
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
  
  // 建立 footer 按鈕 - 直接使用 Google Maps 導航連結
  const footerContents = [
    {
      type: 'button',
      style: 'primary',
      height: 'sm',
      action: {
        type: 'uri',
        label: '🗺️ 開啟 Google 地圖導航',
        uri: mapUrl
      }
    }
  ];
  
  // 建立 Flex Message
  const flexMessage = {
    type: 'flex',
    altText: `${shop.name} - ${mealType}店家資訊`,
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
  
  // 如果有圖片，加入 hero
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

/**
 * 處理礁溪早餐店查詢
 */
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
    return client.replyMessage(replyToken, {
      type: 'text',
      text: textMessage
    });
  }
  
  return null;
}

/**
 * 處理礁溪午餐店查詢
 */
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
    return client.replyMessage(replyToken, {
      type: 'text',
      text: textMessage
    });
  }
  
  return null;
}

/**
 * 處理礁溪晚餐店查詢
 */
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
    return client.replyMessage(replyToken, {
      type: 'text',
      text: textMessage
    });
  }
  
  return null;
}

// ==================== 通用搜尋函數 ====================

/**
 * 通用店家搜尋函數（直接輸入店名即可搜尋）
 */
async function handleShopSearch(userMessage, replyToken, userId) {
  // 先搜尋早餐店
  let results = jiaoxiBreakfastData.searchJiaoxiBreakfastShops(userMessage);
  let shopType = 'breakfast';
  let mealType = '早餐';
  
  if (results.length === 0) {
    results = jiaoxiLunchData.searchJiaoxiLunchShops(userMessage);
    shopType = 'lunch';
    mealType = '午餐';
  }
  
  if (results.length === 0) {
    results = jiaoxiDinnerData.searchJiaoxiDinnerShops(userMessage);
    shopType = 'dinner';
    mealType = '晚餐';
  }
  
  if (results.length === 0) {
    return client.replyMessage(replyToken, {
      type: 'text',
      text: `🔍 找不到「${userMessage}」相關的店家\n\n💡 提示：\n• 輸入「礁溪早餐」查看所有早餐店\n• 輸入「礁溪午餐」查看所有午餐店\n• 輸入「礁溪晚餐」查看所有晚餐店\n• 或直接輸入店名搜尋`
    });
  }
  
  // 如果只有一筆結果，直接顯示詳細資訊（使用 Flex Message）
  if (results.length === 1) {
    const shop = results[0];
    const flexMessage = createShopDetailFlexMessage(shop, mealType);
    return client.replyMessage(replyToken, flexMessage);
  }
  
  // 多筆結果，顯示列表（支援分頁）
  userSessions.set(userId, {
    type: shopType,
    region: '礁溪',
    shops: results,
    page: 1
  });
  
  const textMessage = formatShopMessageWithPagination(results, 1, mealType, '礁溪');
  return client.replyMessage(replyToken, {
    type: 'text',
    text: textMessage
  });
}

// ==================== 通用分頁處理函數 ====================

/**
 * 通用分頁處理函數
 */
async function handlePagination(userMessage, replyToken, userId) {
  const session = userSessions.get(userId);
  if (!session || !session.shops) {
    return client.replyMessage(replyToken, {
      type: 'text',
      text: '🔍 請先輸入「礁溪早餐」、「礁溪午餐」或「礁溪晚餐」開始查詢，或直接輸入店名搜尋'
    });
  }
  
  const { type, region, shops, page } = session;
  let mealType = '';
  if (type === 'breakfast') mealType = '早餐';
  else if (type === 'lunch') mealType = '午餐';
  else if (type === 'dinner') mealType = '晚餐';
  
  const totalPages = Math.ceil(shops.length / 30);
  
  if (userMessage === '下一頁') {
    const nextPage = page + 1;
    if (nextPage <= totalPages) {
      session.page = nextPage;
      userSessions.set(userId, session);
      const textMessage = formatShopMessageWithPagination(shops, nextPage, mealType, region);
      return client.replyMessage(replyToken, {
        type: 'text',
        text: textMessage
      });
    } else {
      return client.replyMessage(replyToken, {
        type: 'text',
        text: `📄 已經是最後一頁了！\n\n💡 輸入「${region}${mealType}」重新查看`
      });
    }
  }
  
  if (userMessage === '上一頁') {
    const prevPage = page - 1;
    if (prevPage >= 1) {
      session.page = prevPage;
      userSessions.set(userId, session);
      const textMessage = formatShopMessageWithPagination(shops, prevPage, mealType, region);
      return client.replyMessage(replyToken, {
        type: 'text',
        text: textMessage
      });
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

/**
 * 處理 Line 事件
 */
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userMessage = event.message.text;
  const userId = event.source.userId;

  // 除錯指令
  if (userMessage === '!debug') {
    const debugInfo = await getDebugInfo();
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: debugInfo
    });
  }

  // 處理通用分頁指令
  if (userMessage === '下一頁' || userMessage === '上一頁') {
    await handlePagination(userMessage, event.replyToken, userId);
    return;
  }

  // 礁溪早餐查詢
  if (userMessage === '礁溪早餐') {
    await handleJiaoxiBreakfastQuery(userMessage, event.replyToken, userId);
    return;
  }

  // 礁溪午餐查詢
  if (userMessage === '礁溪午餐') {
    await handleJiaoxiLunchQuery(userMessage, event.replyToken, userId);
    return;
  }
  
  // 礁溪晚餐查詢
  if (userMessage === '礁溪晚餐') {
    await handleJiaoxiDinnerQuery(userMessage, event.replyToken, userId);
    return;
  }

  // 天氣查詢
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

  // 直接輸入店名搜尋
  const excludeKeywords = ['天氣', '宜蘭', '早餐', '午餐', '晚餐', '下一頁', '上一頁', '!debug'];
  const isExcluded = excludeKeywords.some(keyword => userMessage.includes(keyword));
  
  if (!isExcluded && userMessage.trim().length > 0) {
    await handleShopSearch(userMessage, event.replyToken, userId);
    return;
  }

  // 預設回應
  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: '請輸入指令查詢資訊：\n\n🌤️ 「天氣」或「宜蘭」查詢天氣\n🍳 「礁溪早餐」查詢礁溪早餐店\n🍱 「礁溪午餐」查詢礁溪午餐店\n🍽️ 「礁溪晚餐」查詢礁溪晚餐店\n\n📖 分頁功能：\n   查看列表後輸入「下一頁」或「上一頁」\n\n🔍 直接輸入店名搜尋：\n   例如：酷克伊早餐、甕窯雞\n🛠️ 「!debug」查看API除錯資訊'
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
  console.log(`礁溪早餐店資料庫已載入，共 ${jiaoxiBreakfastData.getJiaoxiBreakfastShopsCount()} 間店家`);
  console.log(`礁溪午餐店資料庫已載入，共 ${jiaoxiLunchData.getJiaoxiLunchShopsCount()} 間店家`);
  console.log(`礁溪晚餐店資料庫已載入，共 ${jiaoxiDinnerData.getJiaoxiDinnerShopsCount()} 間店家`);
});

module.exports = app;
