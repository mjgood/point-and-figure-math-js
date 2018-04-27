// converts ticker data into point and figure data
const defaultReversal = 3;
const defaultBoxSizes = [
    {
        min : 0,
        max : 5,
        size : 0.25
    },
    {
        min : 5,
        max : 20,
        size : 0.5,
    },
    {
        min : 20,
        max : 100,
        size : 1
    },
    {
        min : 100,
        max : 200,
        size : 2
    },
    {
        min : 200,
        max : Infinity,
        size : 4
    },
];

// parameters are the following:
//     reversal : integer, optional
//     boxSizes : array (of JSON objects, see default boxSizes), optional
//     percent : float, optional

function pfData(parameters) {
    if (parameters == null) {
        parameters = {};
    }
    else if (typeof parameters != "object") {
        throw new Error("Parameters have been changed to JSON format in point-and-figure-data 1.1.0");
        return;
    }

    var reversal = parameters.reversal || defaultReversal;
    var percent = parameters.percent || false;
    var boxSizes;

    if (typeof percent == "number") {
        this.percentScale = 1 + (percent / 100);
        boxSizes = [
            {
                min : 1,
                max : this.percentScale,
                size : this.percentScale - 1
            }
        ];
    }
    else {
        boxSizes = parameters.boxSizes || defaultBoxSizes;
    }

    this.bars = [];                                          // the set of point and figure bars from newest to oldest
    this.reversal = reversal;                                // minimum amount needed for a reversal
    this.boxSizes = boxSizes;                                // these are the box sizes being used
    this.currentBar;                                         // set by barWorker.createNew

    this.barWorker = {
        // sets currentBar to a new bar
        newBar : (date, startVal, type) => {
            if (type == null) { type = "unknown"; }

            this.currentBar = {
                startDate : date,
                startVal : startVal,
                type : type
            };
        },

        // prepares the startVal parameter for the newBar function by converting a price object
        newBarFromData : (data) => {
            var close = data.close;
            var date = data.date;
            var boxPrice = this.boxWorker.boxPrice(close);
            this.barWorker.newBar(date, boxPrice);
        },

        addData : (data) => {
            var high = data.high;
            var low = data.low;
            var close = data.close;

            // if this is for a mutual fund we'll have to use the close
            if (high == null) { high = close; }
            if (low == null) { low = close; }

            var testX = this.boxWorker.boxPrice(high, "X");
            var testO = this.boxWorker.boxPrice(low, "O");
            var reversal = this.reversal;

            if (this.currentBar.type == "unknown") {
                if (this.boxWorker.diffBoxesFilled(this.currentBar.startVal, low) >= reversal) {
                    this.currentBar.type = "O";
                    this.currentBar.endVal = testO;
                }
                else if (this.boxWorker.diffBoxesFilled(this.currentBar.startVal, high) >= reversal) {
                    this.currentBar.type = "X";
                    this.currentBar.endVal = testX;
                }
            }
            else if (this.currentBar.type == "X") {
                // check for continuation
                if (testX > this.currentBar.endVal) {
                    this.currentBar.endVal = testX;
                }
                // check for reversal. If true, add current bar, and make new O bar
                else if (this.boxWorker.diffBoxesFilled(this.currentBar.endVal, testO) >= reversal) {
                    this.barWorker.finishBar(data.date, testO);
                }
            }
            else if (this.currentBar.type == "O") {
                // check for continuation
                if (testO < this.currentBar.endVal) {
                    this.currentBar.endVal = testO;
                }
                // check for reversal. If true, add current bar, and make new O bar
                else if (this.boxWorker.diffBoxesFilled(this.currentBar.endVal, testX) >= reversal) {
                    this.barWorker.finishBar(data.date, testX);
                }
            }
        },

        finishBar : (date, newBarEndPrice ) => {
            // add the current bar to the set of bars
            this.currentBar.endDate = date;
            this.currentBar.numBoxes = this.boxWorker.columnBoxes(this.currentBar);
            this.bars.unshift(this.currentBar);

            // setup the new bar
            var newType;
            var m;
            if (this.currentBar.type == "X") {
                newType = "O";
                m = -1;
            }
            if (this.currentBar.type == "O") {
                newType = "X";
                m = 1;
            }

            var lastEnd = this.currentBar.endVal;
            var boxSize = this.boxWorker.boxSize(lastEnd);
            var startVal = lastEnd + (boxSize * m);
            this.barWorker.newBar(date, startVal, newType);
            this.currentBar.endVal = newBarEndPrice;
        }
    };

    // functions for the box size
    this.boxWorker = {
        // adds a box to the top or bottom of a percent box array
        addBoxPercent: (whichEnd) => {
            if (whichEnd == "top") {
                var lastBoxSize = this.boxSizes[this.boxSizes.length - 1];
                this.boxSizes.push({
                    min : lastBoxSize.max,
                    max : lastBoxSize.max * this.percentScale,
                    size : ((lastBoxSize.max * this.percentScale) - lastBoxSize.max)
                });
            }
            else if (whichEnd == "bottom") {
                var nextBoxSize = this.boxSizes[0];
                this.boxSizes.unshift({
                    min : nextBoxSize.min / this.percentScale,
                    max : nextBoxSize.min,
                    size : (nextBoxSize.min - (nextBoxSize.min / this.percentScale))
                });
            }
        },

        // returns the price in terms of a box
        boxPrice : (priceCheck, type) => {
            var cSize = this.boxWorker.boxSize(priceCheck);
            if (type == "X") {
                return Math.floor(priceCheck / cSize) * cSize;
            }
            else if (type == "O") {
                return Math.ceil(priceCheck / cSize) * cSize;
            }
            else {
                return  Math.round(priceCheck / cSize) * cSize;
            }
        },

        // returns the box size based on the price
        boxSize : (priceCheck) => {
            var boxSizes = this.boxSizes;
            for (var i = 0; i < boxSizes.length; i++) {
                var cSize = boxSizes[i];

                // if percents are enabled, add more boxes as needed
                if ((this.percentScale != null) && (i == 0) && (priceCheck < cSize.min)) {
                    this.boxWorker.addBoxPercent("bottom");
                    boxSizes = this.boxSizes;
                    i--;
                }
                // check the current box to see if we are within its bounds
                else if (priceCheck >= cSize.min && priceCheck <= cSize.max) {
                    return cSize.size;
                }
                // if percents are enabled, add more boxes as needed
                else if ((this.percentScale != null) && (i == boxSizes.length - 1) && (priceCheck > cSize.max)) {
                    this.boxWorker.addBoxPercent("top");
                    boxSizes = this.boxSizes;
                    this.boxSizes = boxSizes;
                }
            }
        },

        // figures out how many boxes are in a column
        columnBoxes : (currentBar) => {
            return this.boxWorker.diffBoxesFilled(currentBar.startVal, currentBar.endVal, currentBar.type) + 1;
        },

        // figures out how many boxes are between two price points
        diffBoxesFilled : (startVal, endVal, type) => {
            // setup variables
            var boxes = 0;
            var boxRef;
            var direction;
            var priceAt = parseFloat(startVal);

            // set the starting layer and other values based on column type
            if (type == "O" || startVal > endVal) {
                boxRef = this.boxSizes.length - 1;
                direction = -1;
                while (startVal <= this.boxSizes[boxRef].min) {
                    boxRef = boxRef - 1;

                    // if this is a percent P&F, add extra boxes as needed
                    if (this.percentScale != null && boxRef < 0) {
                        this.boxWorker.addBoxPercent("bottom");
                        boxRef = 0;
                    }
                }
            }
            else if (type == "X" || startVal < endVal) {
                boxRef = 0;
                direction = 1;
                while (startVal >= this.boxSizes[boxRef].max) {
                    boxRef = boxRef + 1;

                    // if this is a percent P&F, add extra boxes as needed
                    if (this.percentScale != null && boxRef >= this.boxSizes.length) {
                        this.boxWorker.addBoxPercent("top");
                    }
                }
            }

            // loop through the start to end value, adding boxes as we go
            while (endVal * direction > priceAt * direction) {
                if ((direction < 0 && priceAt <= this.boxSizes[boxRef].min) ||
                    (direction > 0 && priceAt >= this.boxSizes[boxRef].max)) {
                        boxRef += direction;

                        // if this is a percent P&F, add extra boxes as needed
                        if (this.percentScale != null && this.boxSizes[boxRef] == null) {
                            if (direction > 0) {
                                this.boxWorker.addBoxPercent("top");
                            }
                            else {
                                this.boxWorker.addBoxPercent("bottom");
                            }
                        }
                }

                priceAt += this.boxSizes[boxRef].size * direction;
                boxes += 1;
            }

            return boxes;
        }
    };
};

// returns a pfData object representing a point & figure data structure built from historical price data
// it assumes data is an array of json with {date, high, low, close} properties set
// it also assumes the array is sorted newest date to oldest date
function convert(data, parameters) {
    var myPfData = new pfData(parameters);

    if (data.length > 0) {
         myPfData.barWorker.newBarFromData(data[data.length - 1]);
    }

    for (var i = data.length - 1; i >= 0; i--) {
        myPfData.barWorker.addData(data[i]);
    }

    myPfData.barWorker.finishBar(data[0].date, data[0].close);

    return myPfData;
};

module.exports = {
    pfData : pfData,
    convert : convert
};
