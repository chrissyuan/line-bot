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
    const minT = elements36.find(e => e.elementName === "MinT").time[0].parameter.parameterName;
    const maxT = elements36.find(e => e.elementName === "MaxT").time[0].parameter.parameterName;

    let sixHourText = "";
    for (let i = 0; i < 3; i++) {
      const start = wx[i].startTime.substring(11, 16);
      const end = wx[i].endTime.substring(11, 16);
      const weather = wx[i].parameter.parameterName;
      const rain = pop[i].parameter.parameterName;

      sixHourText += `${start}-${end} ${weather} ☔${rain}%\n`;
    }

    // ===== 7天預報 API =====
    const res7 = await axios.get(
      `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-003?Authorization=${CWA_API_KEY}&locationName=宜蘭縣`
    );

    const location7 = res7.data.records.locations[0].location[0];
    const elements7 = location7.weatherElement;

    const wx7 = elements7.find(e => e.elementName === "Wx").time;
    const minT7 = elements7.find(e => e.elementName === "MinT").time;
    const maxT7 = elements7.find(e => e.elementName === "MaxT").time;

    let weekText = "";

    for (let i = 0; i < 5; i++) {
      const date = wx7[i].startTime.substring(5, 10);
      const weather = wx7[i].parameter.parameterName;
      const minTemp = minT7[i].parameter.parameterName;
      const maxTemp = maxT7[i].parameter.parameterName;

      weekText += `${date} ${weather} ${maxTemp}°/${minTemp}°\n`;
    }

    return (
      `📍 宜蘭縣天氣總覽\n` +
      `━━━━━━━━━━━━\n\n` +
      `🌡 氣溫：${minT}°C ~ ${maxT}°C\n` +
      `☁️ 天氣：${wx[0].parameter.parameterName}\n` +
      `☔ 降雨機率：${pop[0].parameter.parameterName}%\n\n` +
      `🕒 未來 6 小時區間\n` +
      sixHourText +
      `\n📅 未來 5 天\n` +
      weekText +
      `━━━━━━━━━━━━\n資料來源：中央氣象署`
    );

  } catch (error) {
    console.log("錯誤內容：", error.response?.data || error.message);
    return "⚠️ 無法取得天氣資料";
  }
}
