const pfData = require("./point-and-figure-data.js");
const fs = require("fs");

// before starting the demo, read in some existing ticker prices
var data = [];
var dataIn = fs.readFileSync("data.csv", "utf8").split(/([\r]|[\n])+/);
for (var i = 0; i < dataIn.length; i++) {
    var row = dataIn[i].split(",");
    if (row.length == 4) {
        data.push({
            date : row[0],
            high : row[1],
            low : row[2],
            close : row[3]
        });
    }
}

// demo the point and figure conversion
var demoPfData = pfData.convert(data);
console.log("DEFAULT X AND O BARS");
console.log("*******************************************************");
for (var i = 0; i < demoPfData.bars.length; i++) {
    console.log(JSON.stringify(demoPfData.bars[i]));
}

// demo the point and figure conversion for percentage P&F charts
var demoPfDataPercent = pfData.convert(data, {"percent" : 2});
console.log("");
console.log("X AND O BARS WITH PERCENT CALCULATED");
console.log("*******************************************************");
for (var i = 0; i < demoPfDataPercent.bars.length; i++) {
    // format the points of the bars for easier viewing
    demoPfDataPercent.bars[i].startVal = demoPfDataPercent.bars[i].startVal.toFixed(2);
    demoPfDataPercent.bars[i].endVal = demoPfDataPercent.bars[i].endVal.toFixed(2);
    
    console.log(JSON.stringify(demoPfDataPercent.bars[i]));
}
