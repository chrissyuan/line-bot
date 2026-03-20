const fs = require("fs");

const breakfastList = JSON.parse(
  fs.readFileSync("./data/breakfast.json")
);

// 取得全部早餐
function getBreakfastList() {
  return breakfastList;
}

// 隨機推薦
function randomBreakfast() {
  const randomIndex = Math.floor(Math.random() * breakfastList.length);
  return breakfastList[randomIndex];
}

module.exports = {
  getBreakfastList,
  randomBreakfast
};