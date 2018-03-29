const pfData = require("./point_and_figure_data.js");
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
for (var i = 0; i < demoPfData.bars.length; i++) {
    console.log(JSON.stringify(demoPfData.bars[i]));
}
