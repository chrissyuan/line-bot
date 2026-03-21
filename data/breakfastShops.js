// 早餐店資料庫
const breakfastShops = [
  {
    name: '鄉村堡',
    address: '262宜蘭縣礁溪鄉礁溪路一段117號',
    hours: '06:00–11:30',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路一段117號'
  },
  {
    name: '漢林早餐店',
    address: '262宜蘭縣礁溪鄉礁溪路一段79號',
    hours: '05:30–10:30',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路一段79號'
  },
  {
    name: '十六結寶珠姨早餐店',
    address: '262宜蘭縣礁溪鄉礁溪路三段181號',
    hours: '07:00–11:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路三段181號'
  },
  {
    name: '麥當勞',
    address: '262宜蘭縣礁溪鄉礁溪路四段158號',
    hours: '05:00–04:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路四段158號'
  },
  {
    name: '王記包子饅頭',
    address: '262宜蘭縣礁溪鄉礁溪路四段163號',
    hours: '05:00–11:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路四段163號'
  },
  {
    name: '大家來自助餐',
    address: '262宜蘭縣礁溪鄉礁溪路四段162號',
    hours: '07:00–13:30、16:00–20:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路四段162號'
  },
  {
    name: '清珍早點',
    address: '262宜蘭縣礁溪鄉礁溪路四段208號',
    hours: '04:30–11:00（週三休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路四段208號'
  },
  {
    name: '劉家早點',
    address: '262宜蘭縣礁溪鄉礁溪路四段210號',
    hours: '06:00–10:30',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路四段210號'
  },
  {
    name: '山東饅頭',
    address: '262宜蘭縣礁溪鄉礁溪路四段190號',
    hours: '04:50–11:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路四段190號'
  },
  {
    name: '山越早點',
    address: '262宜蘭縣礁溪鄉礁溪路四段29號',
    hours: '06:00–13:00（週四休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路四段29號'
  },
  {
    name: '阿順黑飯糰',
    address: '262宜蘭縣礁溪鄉礁溪路四段166號',
    hours: '05:40–10:30',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路四段166號'
  },
  {
    name: '柯氏蔥油餅',
    address: '262宜蘭縣礁溪鄉礁溪路四段128號',
    hours: '09:00–18:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路四段128號'
  },
  {
    name: '晨間廚房 宜蘭礁溪店',
    address: '262宜蘭縣礁溪鄉礁溪路四段173號',
    hours: '06:30–12:30',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路四段173號'
  },
  {
    name: '早安有約',
    address: '262宜蘭縣礁溪鄉礁溪路四段112號',
    hours: '04:00–12:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路四段112號'
  },
  {
    name: '初 firstday food 早午餐',
    address: '262宜蘭縣礁溪鄉礁溪路四段22號',
    hours: '06:30-14:30',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路四段22號'
  },
  {
    name: '芳芳商店早午餐',
    address: '262宜蘭縣礁溪鄉礁溪路四段109號',
    hours: '08:00-16:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路四段109號'
  },
  {
    name: '宅男粉漿蛋餅',
    address: '262宜蘭縣礁溪鄉礁溪路四段217號',
    hours: '06:30–13:30',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路四段217號'
  },
  {
    name: 'ToDo早午餐礁溪店',
    address: '262宜蘭縣礁溪鄉礁溪路四段105號',
    hours: '06:00-13:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路四段105號'
  },
  {
    name: '漢之林早餐',
    address: '262宜蘭縣礁溪鄉礁溪路四段145號',
    hours: '06:00–11:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路四段145號'
  },
  {
    name: '晨美早餐美而美',
    address: '262宜蘭縣礁溪鄉礁溪路五段10號',
    hours: '05:30–20:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路五段10號'
  },
  {
    name: '摩斯漢堡',
    address: '262宜蘭縣礁溪鄉礁溪路五段51、53號1-2樓',
    hours: '07:00–21:30',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路五段51號'
  },
  {
    name: '奶油麵包',
    address: '262宜蘭縣礁溪鄉礁溪路六段35號',
    hours: '10:00–17:30',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路六段35號'
  },
  {
    name: '礁溪全佳堡早餐店',
    address: '262宜蘭縣礁溪鄉礁溪路七段89號',
    hours: '05:00–10:30',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路七段89號'
  },
  {
    name: '酷克伊早餐',
    address: '262宜蘭縣礁溪鄉礁溪路七段83號',
    hours: '07:00-10:30',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路七段83號'
  },
  {
    name: '美而美早餐店',
    address: '262宜蘭縣礁溪鄉大忠路9號',
    hours: '05:00–11:30',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉大忠路9號'
  },
  {
    name: '喜拉朵美式早餐',
    address: '262宜蘭縣礁溪鄉大忠路42-1號',
    hours: '06:00–12:30（週三休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉大忠路42-1號'
  },
  {
    name: '海皮漢堡',
    address: '262宜蘭縣礁溪鄉大忠路217號1樓',
    hours: '08:00-16:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉大忠路217號'
  },
  {
    name: '立林早餐店',
    address: '262宜蘭縣礁溪鄉大忠路140號',
    hours: '06:00–11:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉大忠路140號'
  },
  {
    name: '銀座中西式早餐',
    address: '262宜蘭縣礁溪鄉大忠路259號',
    hours: '05:00–12:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉大忠路259號'
  },
  {
    name: '礁溪鄉和平路美而美',
    address: '262宜蘭縣礁溪鄉和平路78號',
    hours: '06:30–13:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉和平路78號'
  },
  {
    name: '點早餐',
    address: '262宜蘭縣礁溪鄉和平路47號',
    hours: '06:30–13:30',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉和平路47號'
  },
  {
    name: '妞妞堡 元氣早餐',
    address: '262宜蘭縣礁溪鄉中山路一段202號',
    hours: '06:00–12:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路一段202號'
  },
  {
    name: 'MORRIS健康廚房',
    address: '262宜蘭縣礁溪鄉中山路一段316號',
    hours: '07:30-15:30',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路一段316號'
  },
  {
    name: '尼莫早午餐',
    address: '262宜蘭縣礁溪鄉中山路一段143號',
    hours: '06:00–12:30、17:30–23:30',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路一段143號'
  },
  {
    name: '中式早餐（古錐嬤）',
    address: '262宜蘭縣礁溪鄉中山路一段282號',
    hours: '05:00–14:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路一段282號'
  },
  {
    name: '曾記豆漿店',
    address: '262宜蘭縣礁溪鄉中山路一段113號',
    hours: '05:00–12:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路一段113號'
  },
  {
    name: '礁溪素食',
    address: '262宜蘭縣礁溪鄉中山路一段270號',
    hours: '06:30–14:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路一段270號'
  },
  {
    name: '拉亞漢堡',
    address: '262宜蘭縣礁溪鄉中山路一段239號',
    hours: '06:00–14:30',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路一段239號'
  },
  {
    name: '米澤廳',
    address: '262宜蘭縣礁溪鄉中山路二段187號',
    hours: '07:00–10:00、17:30–21:30',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路二段187號'
  },
  {
    name: '礁溪魚丸米粉麻醬麵',
    address: '262宜蘭縣礁溪鄉中山路二段114號',
    hours: '05:30–14:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路二段114號'
  },
  {
    name: '城市漢堡 礁溪店',
    address: '262宜蘭縣礁溪鄉德陽路79號',
    hours: '06:00–13:30',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉德陽路79號'
  },
  {
    name: '賜福自助餐',
    address: '262宜蘭縣礁溪鄉德陽路63號',
    hours: '06:00–14:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉德陽路63號'
  },
  {
    name: '正常鮮肉小湯包',
    address: '262宜蘭縣礁溪鄉德陽街1號',
    hours: '07:00–14:30',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉德陽街1號'
  },
  {
    name: '捌家早餐',
    address: '262宜蘭縣礁溪鄉育才路10-1號',
    hours: '06:00–12:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉育才路10-1號'
  },
  {
    name: '喆食喆日早午餐',
    address: '262宜蘭縣礁溪鄉育英路6號',
    hours: '06:30–13:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉育英路6號'
  },
  {
    name: '四城早點',
    address: '262宜蘭縣礁溪鄉育英路48號',
    hours: '06:00–11:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉育英路48號'
  },
  {
    name: '恰早早餐店',
    address: '262宜蘭縣礁溪鄉育英路63號',
    hours: '06:00–11:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉育英路63號'
  },
  {
    name: '小荳荳早午餐',
    address: '262宜蘭縣礁溪鄉溫泉路28號',
    hours: '05:30–12:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉溫泉路28號'
  },
  {
    name: 'Tomato Cafe',
    address: '262宜蘭縣礁溪鄉溫泉路10號',
    hours: '08:00-16:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉溫泉路10號'
  },
  {
    name: '三燔礁溪',
    address: '262宜蘭縣礁溪鄉溫泉路67號11樓',
    hours: '07:00–11:00、17:20–19:00、19:30–21:10',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉溫泉路67號'
  },
  {
    name: '早吳吃麵',
    address: '262宜蘭縣礁溪鄉玉龍路一段388號',
    hours: '06:30-13:30',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉玉龍路一段388號'
  },
  {
    name: '玉田早餐',
    address: '262宜蘭縣礁溪鄉玉龍路一段550號',
    hours: '05:00–10:30',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉玉龍路一段550號'
  },
  {
    name: '玉香堡早餐店',
    address: '262宜蘭縣礁溪鄉玉龍路一段352號',
    hours: '05:00–11:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉玉龍路一段352號'
  },
  {
    name: '227早餐',
    address: '262宜蘭縣礁溪鄉玉龍路一段227號',
    hours: '06:00–10:30',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉玉龍路一段227號'
  },
  {
    name: '二木早午餐',
    address: '262宜蘭縣礁溪鄉公園北路6巷2號',
    hours: '06:30–13:00（週二、三休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉公園北路6巷2號'
  },
  {
    name: '了了礁溪',
    address: '262宜蘭縣礁溪鄉公園路70巷30號1樓',
    hours: '07:00-22:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉公園路70巷30號'
  },
  {
    name: '科科家早午餐',
    address: '262宜蘭縣礁溪鄉礁溪路四段31巷15號',
    hours: '08:00–15:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路四段31巷15號'
  },
  {
    name: '萬記商行',
    address: '262宜蘭縣礁溪鄉興農路266-3號',
    hours: '10:30–17:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉興農路266-3號'
  },
  {
    name: '白雲山鹿',
    address: '262宜蘭縣礁溪鄉白雲三路30巷61弄26號',
    hours: '07:00–12:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉白雲三路30巷61弄26號'
  },
  {
    name: '蒔花咖啡',
    address: '26249宜蘭縣礁溪鄉十六結路23之17號',
    hours: '10:00–18:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉十六結路23之17號'
  },
  {
    name: 'Wa Cow Brunch',
    address: '262宜蘭縣礁溪鄉信義路4號',
    hours: '11:00-14:00 15:00-20:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉信義路4號'
  },
  {
    name: '品文旅礁溪',
    address: '26241宜蘭縣礁溪鄉健康二街21巷2號',
    hours: '06:30-20:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉健康二街21巷2號'
  },
  {
    name: '焰餐廳 Le Flame',
    address: '262007宜蘭縣礁溪鄉五峰路89-6號',
    hours: '07:00–21:30',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉五峰路89-6號'
  },
  {
    name: '奶呼呼早餐店',
    address: '262宜蘭縣礁溪鄉踏踏一路158號',
    hours: '07:00–11:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉踏踏一路158號'
  },
  {
    name: '美味珍早餐',
    address: '262宜蘭縣礁溪鄉',
    hours: '06:00–11:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉'
  },
  {
    name: '龍潭香香堡',
    address: '260宜蘭縣宜蘭市大坡路二段207號',
    hours: '05:00–11:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=260宜蘭縣宜蘭市大坡路二段207號'
  },
  {
    name: '晨曦早午餐',
    address: '262宜蘭縣礁溪鄉三皇路93號',
    hours: '06:00–12:30',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉三皇路93號'
  },
  {
    name: '阿霞早餐店',
    address: '262宜蘭縣礁溪鄉龍泉路8號',
    hours: '06:00–10:30',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉龍泉路8號'
  },
  {
    name: '瑞麟美又美',
    address: '262宜蘭縣礁溪鄉大坡路108號',
    hours: '05:30–11:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉大坡路108號'
  },
  {
    name: '亨利漢堡',
    address: '262宜蘭縣礁溪鄉三皇路12號',
    hours: '06:00–11:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉三皇路12號'
  },
  {
    name: '桂英小吃',
    address: '262宜蘭縣礁溪鄉中山路二段53號',
    hours: '星期二、07:00–14:30、17:00–20:30',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路二段53號'
  },
  {
    name: '玖食雞湯小卷米粉',
    address: '262宜蘭縣礁溪鄉仁愛路118號',
    hours: '星期二、11:00–14:00、17:00–20:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉仁愛路118號'
  },
  {
    name: '礁溪九份傳統美食',
    address: '262宜蘭縣礁溪鄉中山路二段71號',
    hours: '星期二、09:30–14:00、16:30–20:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路二段71號'
  },
  {
    name: '礁溪雞肉飯',
    address: '262宜蘭縣礁溪鄉中山路一段103號',
    hours: '星期二、09:30–18:30',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路一段103號'
  },
  {
    name: '礁溪鐘氏肉羹',
    address: '262宜蘭縣礁溪鄉中山路二段19號',
    hours: '星期二、09:00–19:45',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路二段19號'
  },
  {
    name: '礁溪太祖魷魚羹',
    address: '262宜蘭縣礁溪鄉中山路一段322號',
    hours: '星期二、08:00–15:30',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路一段322號'
  },
  {
    name: '快樂小吃',
    address: '262宜蘭縣礁溪鄉中山路一段135號',
    hours: '星期三、06:30–14:30',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路一段135號'
  }
];

// 根據關鍵字搜尋早餐店（只搜尋店名）
function searchBreakfastShops(keyword) {
  if (!keyword) return breakfastShops;
  
  const lowerKeyword = keyword.toLowerCase();
  return breakfastShops.filter(shop => 
    shop.name.toLowerCase().includes(lowerKeyword)
  );
}

// 取得所有早餐店
function getAllBreakfastShops() {
  return breakfastShops;
}

// 取得早餐店數量
function getBreakfastShopsCount() {
  return breakfastShops.length;
}

// 獲取單一店家詳細資訊
function getShopDetail(shopName) {
  const shop = breakfastShops.find(s => 
    s.name.includes(shopName) || 
    shopName.includes(s.name)
  );
  
  if (!shop) return null;
  
  let detail = `🍳 ${shop.name}\n`;
  detail += `━━━━━━━━━━━━\n`;
  detail += `📍 ${shop.address}\n`;
  detail += `🕐 ${shop.hours}\n`;
  detail += `🔗 ${shop.mapLink}`;
  
  return detail;
}

// 格式化早餐店訊息（簡潔版）
function formatBreakfastMessage(shops, limit = 30) {
  if (!shops || shops.length === 0) {
    return '🍳 找不到相關的早餐店\n\n💡 提示：可以試試搜尋「早餐」來查看所有店家';
  }

  let message = '🍳 礁溪早餐店推薦\n';
  message += '━━━━━━━━━━━━\n\n';
  
  const displayShops = shops.slice(0, limit);
  
  // 簡潔顯示：只顯示編號和店名
  displayShops.forEach((shop, index) => {
    message += `${index + 1}. ${shop.name}\n`;
  });
  
  if (shops.length > limit) {
    message += `\n📊 還有 ${shops.length - limit} 間店家\n`;
    message += `💡 輸入「早餐 店名」搜尋特定店家`;
  } else {
    message += `\n📝 共 ${shops.length} 間早餐店\n`;
    message += `💡 輸入「早餐 店名」查看詳細資訊`;
  }
  
  message += `\n━━━━━━━━━━━━\n🔍 例如：早餐 柯氏蔥油餅`;
  
  return message;
}

module.exports = {
  breakfastShops,
  searchBreakfastShops,
  getAllBreakfastShops,
  getBreakfastShopsCount,
  getShopDetail,
  formatBreakfastMessage
};
