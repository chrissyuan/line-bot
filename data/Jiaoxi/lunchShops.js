// 午餐店資料庫
const lunchShops = [
  {
    name: '拾松辦桌小吃礁溪',
    address: '262003宜蘭縣礁溪鄉奇峰街36號',
    hours: '11:00–14:00、17:00–20:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉奇峰街36號'
  },
  {
    name: '天下第一窯烤雞',
    address: '262宜蘭縣礁溪鄉礁溪路三段42號',
    hours: '11:00–16:00、17:00–20:30',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路三段42號'
  },
  {
    name: '快炒樂室',
    address: '262宜蘭縣礁溪鄉健康一街20號',
    hours: '11:30–14:00、17:00–21:30',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉健康一街20號'
  },
  {
    name: '橙心手作料理',
    address: '262002宜蘭縣礁溪鄉玉龍路二段460之1號',
    hours: '11:00–14:00、17:00–20:30',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉玉龍路二段460之1號'
  },
  {
    name: '山友拉麵',
    address: '262宜蘭縣礁溪鄉中山路二段187號',
    hours: '11:30–21:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路二段187號'
  },
  {
    name: '告春食彩小家料理',
    address: '262宜蘭縣礁溪鄉礁溪路四段73號',
    hours: '11:30–14:30、17:30–21:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路四段73號'
  },
  {
    name: '里海咖啡',
    address: '262宜蘭縣礁溪鄉玉龍路二段406號',
    hours: '11:30–16:00、17:30–20:30',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉玉龍路二段406號'
  },
  {
    name: '明水然·樂',
    address: '262宜蘭縣礁溪鄉淇武蘭路110-7號1&2樓',
    hours: '12:30–15:00、17:10–21:40',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉淇武蘭路110-7號'
  },
  {
    name: '皇泰火鍋城',
    address: '262008宜蘭縣礁溪鄉和平路122號',
    hours: '11:30–21:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉和平路122號'
  },
  {
    name: '蘭陽蘆花雞餐廳',
    address: '262宜蘭縣礁溪鄉十六結路31之12號',
    hours: '11:30–19:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉十六結路31之12號'
  },
  {
    name: '塭底烤魚',
    address: '262宜蘭縣礁溪鄉玉龍路二段572號',
    hours: '11:00–20:30',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉玉龍路二段572號'
  },
  {
    name: '正好鮮肉小籠包（礁溪店）',
    address: '262宜蘭縣礁溪鄉仁愛路122號',
    hours: '10:30–14:00、16:00–19:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉仁愛路122號'
  },
  {
    name: '正常鮮肉小湯包',
    address: '262宜蘭縣礁溪鄉德陽街1號',
    hours: '07:00–14:30',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉德陽街1號'
  },
  {
    name: '玉仁八寶冬粉',
    address: '262宜蘭縣礁溪鄉中山路一段326號',
    hours: '10:00–20:30',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路一段326號'
  },
  {
    name: 'PARTY泰烤魚餐廳',
    address: '262宜蘭縣礁溪鄉白雲一路28巷1之2號',
    hours: '11:30–15:30、17:00–20:30',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉白雲一路28巷1之2號'
  },
  {
    name: '衷記港式燒臘',
    address: '262宜蘭縣礁溪鄉中山路二段82-1號',
    hours: '10:30–14:00、16:00–19:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路二段82-1號'
  },
  {
    name: '甕窯雞礁溪總店',
    address: '262宜蘭縣礁溪鄉礁溪路七段7之7號',
    hours: '09:00–21:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路七段7之7號'
  },
  {
    name: '松興小吃部',
    address: '262宜蘭縣礁溪鄉中山路一段104號',
    hours: '07:00–18:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路一段104號'
  },
  {
    name: '李面請海鮮粥.粉.麵',
    address: '262宜蘭縣礁溪鄉中山路二段208號',
    hours: '11:00–21:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路二段208號'
  },
  {
    name: '春沐鐵板燒',
    address: '262宜蘭縣礁溪鄉公園路段100巷28號',
    hours: '11:30–14:00、17:30–21:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉公園路100巷28號'
  },
  {
    name: '寒沐中餐廳',
    address: '262601宜蘭縣礁溪鄉健康路1號 礁溪寒沐酒店3樓',
    hours: '11:30–14:30、17:30–21:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉健康路1號'
  },
  {
    name: '好飽餐食便當',
    address: '262宜蘭縣礁溪鄉和平路28號1樓',
    hours: '12:00–14:00、17:30–20:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉和平路28號'
  },
  {
    name: '黑海時光粥',
    address: '262宜蘭縣礁溪鄉和平路107號',
    hours: '11:00–14:00、17:00–20:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉和平路107號'
  },
  {
    name: '有麵煮私房小吃-溫泉店',
    address: '262宜蘭縣礁溪鄉溫泉路59號',
    hours: '11:00–20:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉溫泉路59號'
  },
  {
    name: '陽光田園(礁溪店)',
    address: '262宜蘭縣礁溪鄉仁愛路158號',
    hours: '11:00–14:00、16:30–20:30',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉仁愛路158號'
  },
  {
    name: '冠翔泉旅-饗境餐廳',
    address: '262宜蘭縣礁溪鄉仁愛路66巷6號',
    hours: '07:00–13:30',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉仁愛路66巷6號'
  },
  {
    name: '錢都日式涮涮鍋',
    address: '262宜蘭縣礁溪鄉礁溪路四段156號',
    hours: '11:00–00:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路四段156號'
  },
  {
    name: '礁溪魚丸米粉麻醬麵',
    address: '262宜蘭縣礁溪鄉中山路二段114號',
    hours: '05:30–14:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路二段114號'
  },
  {
    name: '山穀裏',
    address: '262宜蘭縣礁溪鄉林尾路150-10號',
    hours: '10:30–17:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉林尾路150-10號'
  },
  {
    name: '永興小館',
    address: '262宜蘭縣礁溪鄉德陽路124號',
    hours: '11:00–14:00、17:00–20:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉德陽路124號'
  },
  {
    name: '雲天自助餐廳',
    address: '262宜蘭縣礁溪鄉五峰路69號B1',
    hours: '07:00–10:30、11:30–14:00、17:20–19:10、19:30–21:20',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉五峰路69號'
  },
  {
    name: '鴨咪村食坊',
    address: '262宜蘭縣礁溪鄉十六結路三城巷36號',
    hours: '11:30–20:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉十六結路三城巷36號'
  },
  {
    name: '拉亞漢堡',
    address: '262宜蘭縣礁溪鄉中山路一段239號',
    hours: '06:00–14:30',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路一段239號'
  },
  {
    name: '礁溪庄櫻桃谷',
    address: '262宜蘭縣礁溪鄉礁溪路七段72號',
    hours: '11:00–14:00、17:00–20:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路七段72號'
  },
  {
    name: '大家來自助餐',
    address: '262宜蘭縣礁溪鄉礁溪路四段162號',
    hours: '07:00–13:30、16:00–20:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路四段162號'
  },
  {
    name: '享享自助百匯',
    address: '262宜蘭縣礁溪鄉中山路二段218號2樓',
    hours: '07:00–13:00、18:00–20:30',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路二段218號'
  },
  {
    name: '星苑餐廳',
    address: '262宜蘭縣礁溪鄉礁溪路五段118號',
    hours: '06:30–21:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路五段118號'
  },
  {
    name: '珍典精緻自助式火鍋',
    address: '262宜蘭縣礁溪鄉礁溪路六段58號',
    hours: '11:00–22:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路六段58號'
  },
  {
    name: '金佳香烤肉飯',
    address: '262宜蘭縣礁溪鄉中山路二段23號',
    hours: '09:45–19:30',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路二段23號'
  },
  {
    name: '淑蓮清粥店',
    address: '262宜蘭縣礁溪鄉溫泉路27號',
    hours: '10:00–19:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉溫泉路27號'
  },
  {
    name: '廣湘園港式燒臘店',
    address: '262宜蘭縣礁溪鄉中山路二段204號',
    hours: '08:30–14:00、16:00–19:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路二段204號'
  },
  {
    name: '初食軒餐廳',
    address: '262宜蘭縣礁溪鄉仁愛路48巷18弄1號',
    hours: '11:30–14:00、17:30–21:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉仁愛路48巷18弄1號'
  },
  {
    name: '悅德蔬食-鳳凰店',
    address: '262宜蘭縣礁溪鄉健康路50號1樓之2',
    hours: '11:30–14:00、17:00–19:30',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉健康路50號'
  },
  {
    name: '168自助涮涮鍋',
    address: '262宜蘭縣礁溪鄉礁溪路五段1-2號2樓',
    hours: '11:00–14:00、17:00–22:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路五段1號'
  },
  {
    name: '悟饕池上飯包',
    address: '262宜蘭縣礁溪鄉礁溪路五段5巷1號',
    hours: '10:30–20:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路五段5巷1號'
  },
  {
    name: '神濃鍋物',
    address: '262宜蘭縣礁溪鄉礁溪路五段72號',
    hours: '11:00–21:30',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路五段72號'
  },
  {
    name: '陽光什鍋礁溪店',
    address: '262宜蘭縣礁溪鄉仁愛路176號',
    hours: '12:00–20:30',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉仁愛路176號'
  },
  {
    name: '億品鍋礁溪店',
    address: '262宜蘭縣礁溪鄉中山路二段45號',
    hours: '11:30–22:30',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路二段45號'
  },
  {
    name: '上乘三家涮涮鍋',
    address: '262宜蘭縣礁溪鄉中山路二段171之1號',
    hours: '11:30–22:30',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路二段171之1號'
  },
  {
    name: '老先覺麻辣窯燒鍋',
    address: '262宜蘭縣礁溪鄉溫泉路15號',
    hours: '11:30–22:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉溫泉路15號'
  },
  {
    name: '上鼎日式涮涮鍋',
    address: '262宜蘭縣礁溪鄉礁溪路五段37號',
    hours: '10:30–22:00（週一休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路五段37號'
  },
  {
    name: '鼎楓寶島火鍋',
    address: '262宜蘭縣礁溪鄉礁溪路四段185號',
    hours: '11:30–14:30、17:30–21:30（週一休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路四段185號'
  },
  {
    name: '樂樂壽喜燒日式鍋物放題',
    address: '262宜蘭縣礁溪鄉忠孝路43號',
    hours: '11:45–14:30、17:30–21:30（週一休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉忠孝路43號'
  },
  {
    name: '動涮-溫體涮涮鍋',
    address: '262宜蘭縣礁溪鄉礁溪路三段76號',
    hours: '11:00–00:00（週一休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路三段76號'
  },
  {
    name: '告春食彩海鮮鍋物',
    address: '262宜蘭縣礁溪鄉中山路一段67號',
    hours: '11:30–15:00、17:30–21:30（週一休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路一段67號'
  },
  {
    name: '龍爺鳳娘砂鍋粥品',
    address: '262宜蘭縣礁溪鄉仁愛路162號',
    hours: '11:30–21:00（週一休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉仁愛路162號'
  },
  {
    name: '看見廚房',
    address: '262宜蘭縣礁溪鄉中山路一段225號',
    hours: '11:00–14:30、17:00–21:30（週三休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路一段225號'
  },
  {
    name: '東岸池上便當',
    address: '262宜蘭縣礁溪鄉礁溪路四段187號',
    hours: '09:00–13:30、16:00–18:40（週一休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路四段187號'
  },
  {
    name: '飯町烤肉飯-礁溪店',
    address: '262宜蘭縣礁溪鄉溫泉路7號',
    hours: '10:00–14:00、16:00–19:30（週一休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉溫泉路7號'
  },
  {
    name: '明哥便當店',
    address: '262宜蘭縣礁溪鄉中山路一段163號',
    hours: '09:30–19:00（週一休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路一段163號'
  },
  {
    name: '吃飯皇帝大福隆便當',
    address: '262宜蘭縣礁溪鄉礁溪路四段82號',
    hours: '09:00–19:00（週一休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路四段82號'
  },
  {
    name: 'Phở Wild 越式生牛肉河粉',
    address: '262宜蘭縣礁溪鄉礁溪路四段170號',
    hours: '11:00–20:30（週一休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路四段170號'
  },
  {
    name: '蓮記飄香饌',
    address: '262宜蘭縣礁溪鄉中山路一段270號',
    hours: '07:30–13:00（週一休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路一段270號'
  },
  {
    name: '三妹爌肉飯',
    address: '262宜蘭縣礁溪鄉中山路二段134號',
    hours: '08:00–21:00（週一休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路二段134號'
  },
  {
    name: '合鴨米灶腳',
    address: '262宜蘭縣礁溪鄉信義路23號',
    hours: '11:00–14:00、17:00–20:00（週一休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉信義路23號'
  },
  {
    name: '來來自助餐',
    address: '262宜蘭縣礁溪鄉和平路1-1號',
    hours: '09:30–13:30（週一休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉和平路1-1號'
  },
  {
    name: '礁溪 開元豬腳',
    address: '262宜蘭縣礁溪鄉礁溪路四段138號',
    hours: '11:00–14:00、17:00–20:00（週一休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路四段138號'
  },
  {
    name: '鴻福鐵板燒',
    address: '262宜蘭縣礁溪鄉溫泉路26號',
    hours: '11:00–15:30、16:30–19:30（週一休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉溫泉路26號'
  },
  {
    name: '礁溪鬼匠拉麵',
    address: '262宜蘭縣礁溪鄉中山路二段68號',
    hours: '11:00–20:30（週一休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路二段68號'
  },
  {
    name: '要吃肉肉便當專賣店',
    address: '262宜蘭縣礁溪鄉大坡路19號',
    hours: '10:00–18:00（週一休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉大坡路19號'
  },
  {
    name: '桂英小吃',
    address: '262宜蘭縣礁溪鄉中山路二段53號',
    hours: '07:00–14:30、17:00–20:30（週二休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路二段53號'
  },
  {
    name: '玖食雞湯小卷米粉',
    address: '262宜蘭縣礁溪鄉仁愛路118號',
    hours: '11:00–14:00、17:00–20:00（週二休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉仁愛路118號'
  },
  {
    name: '礁溪九份傳統美食',
    address: '262宜蘭縣礁溪鄉中山路二段71號',
    hours: '09:30–14:00、16:30–20:00（週二休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路二段71號'
  },
  {
    name: '礁溪麵當家',
    address: '262宜蘭縣礁溪鄉礁溪路四段169號',
    hours: '11:00–20:00（週二休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路四段169號'
  },
  {
    name: '亓記小卷米粉',
    address: '262008宜蘭縣礁溪鄉德陽路83之1號',
    hours: '11:00–14:00、17:00–21:00（週二休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉德陽路83之1號'
  },
  {
    name: '礁溪雞肉飯',
    address: '262宜蘭縣礁溪鄉中山路一段103號',
    hours: '09:30–18:30（週二休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路一段103號'
  },
  {
    name: '添喜海鮮小吃',
    address: '262宜蘭縣礁溪鄉德陽路91號',
    hours: '11:00–14:00、17:00–20:30（週二休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉德陽路91號'
  },
  {
    name: '陳旺記鴨片飯',
    address: '262宜蘭縣礁溪鄉德陽路30號',
    hours: '11:00–14:00、16:00–19:00（週二休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉德陽路30號'
  },
  {
    name: '人客人什錦麵',
    address: '262宜蘭縣礁溪鄉礁溪路四段45號',
    hours: '10:00–19:00（週二休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路四段45號'
  },
  {
    name: '賴家雙醬麵',
    address: '262宜蘭縣礁溪鄉礁溪路四段52號',
    hours: '10:00–18:00（週二休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路四段52號'
  },
  {
    name: '慶の魚丸',
    address: '262宜蘭縣礁溪鄉中山路一段145號',
    hours: '11:00–13:45、16:30–19:15（週二休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路一段145號'
  },
  {
    name: '礁溪鐘氏肉羹',
    address: '262宜蘭縣礁溪鄉中山路二段19號',
    hours: '09:00–19:45（週二休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路二段19號'
  },
  {
    name: '如意小館',
    address: '262宜蘭縣礁溪鄉德陽路151號',
    hours: '11:00–14:00、17:00–20:00（週二休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉德陽路151號'
  },
  {
    name: '日式料理小吃',
    address: '262宜蘭縣礁溪鄉中山路一段180號',
    hours: '11:00–14:00、16:00–20:00（週二休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路一段180號'
  },
  {
    name: '海口人魩仔魚羹',
    address: '262宜蘭縣礁溪鄉育才路24號',
    hours: '10:30–19:00（週二休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉育才路24號'
  },
  {
    name: '蒸香小籠湯包',
    address: '262宜蘭縣礁溪鄉礁溪路五段90巷2-1號之1',
    hours: '10:30–14:30、17:30–21:00（週三休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路五段90巷2-1號'
  },
  {
    name: '大妹子手工水餃',
    address: '262宜蘭縣礁溪鄉中山路一段39號',
    hours: '11:00–14:30、17:30–21:00（週二休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路一段39號'
  },
  {
    name: '木慶魚丸',
    address: '262宜蘭縣礁溪鄉中山路一段160號',
    hours: '10:30–18:30（週二休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路一段160號'
  },
  {
    name: '270越南小吃',
    address: '262宜蘭縣礁溪鄉中山路一段270號',
    hours: '11:00–19:30（週二休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路一段270號'
  },
  {
    name: '小龍湯包',
    address: '262宜蘭縣礁溪鄉礁溪路四段180號',
    hours: '10:00–04:00（週二休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路四段180號'
  },
  {
    name: '蘭陽肉捲',
    address: '262宜蘭縣礁溪鄉中山路二段101號',
    hours: '11:00–21:00（週二休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路二段101號'
  },
  {
    name: '礁溪太祖魷魚羹',
    address: '262宜蘭縣礁溪鄉中山路一段322號',
    hours: '08:00–15:30（週二休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路一段322號'
  },
  {
    name: '義食坊',
    address: '262宜蘭縣礁溪鄉中山路一段58號',
    hours: '11:00–20:00（週二休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路一段58號'
  },
  {
    name: '林家豬腸冬粉',
    address: '262宜蘭縣礁溪鄉中山路一段276號',
    hours: '10:30–20:00（週三休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路一段276號'
  },
  {
    name: '潘姨肉粽',
    address: '262宜蘭縣礁溪鄉礁溪路二段136號',
    hours: '11:30–14:00、17:00–20:30（週三休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路二段136號'
  },
  {
    name: '快樂小吃',
    address: '262宜蘭縣礁溪鄉中山路一段135號',
    hours: '06:30–14:30（週三休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路一段135號'
  },
  {
    name: '巧香小吃部',
    address: '262宜蘭縣礁溪鄉中山路一段101號',
    hours: '10:30–19:00（週二休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路一段101號'
  },
  {
    name: '新竹鴨肉麵',
    address: '262宜蘭縣礁溪鄉中山路二段139號',
    hours: '11:30–15:30、17:00–20:00（週二休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路二段139號'
  },
  {
    name: '囍魚虱目魚專賣店',
    address: '262宜蘭縣礁溪鄉礁溪路四段129-1號',
    hours: '11:00–14:30、17:00–21:00（週二休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路四段129-1號'
  },
  {
    name: '81飯麵小吃',
    address: '262宜蘭縣礁溪鄉礁溪路一段81號',
    hours: '11:00–14:00、17:00–20:00（週二休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路一段81號'
  },
  {
    name: '礁心鐵板燒',
    address: '262宜蘭縣礁溪鄉溫泉路62號',
    hours: '12:00–14:00、17:30–21:30（週二休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉溫泉路62號'
  },
  {
    name: '三民大飯店',
    address: '262宜蘭縣礁溪鄉礁溪路三段22號',
    hours: '10:00–15:00（週三休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路三段22號'
  },
  {
    name: '焿爸子（國宴肉捲）',
    address: '262宜蘭縣礁溪鄉溫泉路31號',
    hours: '12:00–20:00（週二休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉溫泉路31號'
  },
  {
    name: '元氣鍋燒',
    address: '262宜蘭縣礁溪鄉育才路8號',
    hours: '11:00–19:00（週二休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉育才路8號'
  },
  {
    name: '義眾魚羹之家',
    address: '262宜蘭縣礁溪鄉中山路一段43號',
    hours: '07:00–16:00（週三休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路一段43號'
  },
  {
    name: '北海岸鵝肉快炒',
    address: '262宜蘭縣礁溪鄉德陽路36號',
    hours: '10:00–14:00、17:00–22:00（週二休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉德陽路36號'
  },
  {
    name: '大碗公牛肉麵',
    address: '262宜蘭縣礁溪鄉礁溪路四段172號',
    hours: '11:00–20:45（週二休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路四段172號'
  },
  {
    name: '松興小吃部',
    address: '262宜蘭縣礁溪鄉中山路一段104號',
    hours: '07:00–18:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路一段104號'
  },
  {
    name: '宜蘭滷之鄉',
    address: '262宜蘭縣礁溪鄉礁溪路五段69號',
    hours: '10:00–23:00',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉礁溪路五段69號'
  },
  {
    name: '礁溪鬼匠拉麵',
    address: '262宜蘭縣礁溪鄉中山路二段68號',
    hours: '11:00–20:30（週一休）',
    phone: '',
    mapLink: 'https://maps.google.com/?q=262宜蘭縣礁溪鄉中山路二段68號'
  }
];

// ==================== 工具函數 ====================

/**
 * 根據關鍵字搜尋午餐店（只搜尋店名）
 */
function searchJiaoxiLunchShops(keyword) {
  if (!keyword) return lunchShops;
  const lowerKeyword = keyword.toLowerCase();
  return lunchShops.filter(shop =>
    shop.name.toLowerCase().includes(lowerKeyword)
  );
}

/**
 * 取得所有午餐店
 */
function getAllJiaoxiLunchShops() {
  return lunchShops;
}

/**
 * 取得午餐店數量
 */
function getJiaoxiLunchShopsCount() {
  return lunchShops.length;
}

/**
 * 取得單一店家詳細資訊（含圖片）- 回傳 Line 訊息格式
 */
function getJiaoxiLunchShopDetailWithImage(shopName) {
  const shop = lunchShops.find(s =>
    s.name.includes(shopName) || shopName.includes(s.name)
  );
  if (!shop) return null;

  const textMessage = `🍱 ${shop.name}\n━━━━━━━━━━━━\n📍 ${shop.address}\n🕐 ${shop.hours}\n🔗 ${shop.mapLink}`;

  if (shop.imageUrl) {
    return {
      type: 'image',
      originalContentUrl: shop.imageUrl,
      previewImageUrl: shop.imageUrl
    };
  }

  return {
    type: 'text',
    text: textMessage
  };
}

/**
 * 格式化午餐店訊息
 */
function formatJiaoxiLunchMessage(shops) {
  if (!shops || shops.length === 0) {
    return '🍱 找不到相關的午餐店\n\n💡 提示：輸入「礁溪午餐」查看所有店家';
  }

  let message = '🍱 礁溪午餐店列表\n';
  message += '━━━━━━━━━━━━\n\n';

  const displayShops = shops.slice(0, 30);

  displayShops.forEach((shop, index) => {
    message += `${index + 1}. ${shop.name}\n`;
  });

  if (shops.length > 30) {
    message += `\n📊 還有 ${shops.length - 30} 間店家\n`;
    message += `💡 輸入「礁溪午餐 店名」搜尋特定店家`;
  } else {
    message += `\n📝 共 ${shops.length} 間午餐店\n`;
    message += `💡 輸入「礁溪午餐 店名」查看詳細資訊`;
  }

  message += `\n━━━━━━━━━━━━\n🔍 例如：礁溪午餐 甕窯雞`;

  return message;
}

module.exports = {
  getAllJiaoxiLunchShops,
  getJiaoxiLunchShopsCount,
  searchJiaoxiLunchShops,
  getJiaoxiLunchShopDetailWithImage,
  formatJiaoxiLunchMessage
};
