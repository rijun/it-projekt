// State enum
const States = Object.freeze({"day": {}, "interval": {}, "month": {}, "year": {}});

// Set event handlers
document.getElementById('meterSelector').onchange = setSelectorRanges;
window.onresize = () => {
    if (window.chart === undefined) {
        return;
    }

    if (window.outerWidth < 768) {
        window.chart.options.scales.xAxes[0].scaleLabel.display = false;
        window.chart.options.scales.yAxes.forEach(axis => axis.scaleLabel.display = false);
    } else {
        window.chart.options.scales.xAxes[0].scaleLabel.display = true;
        window.chart.options.scales.yAxes.forEach(axis => axis.scaleLabel.display = true);
    }
};


/* Query modal functions */
function setupMeterSelector() {
    let meterSelector = document.getElementById('meterSelector');
    for (let meter in store.get('meters')) {
        let opt = document.createElement('option');
        opt.value = meter;
        opt.innerHTML = meter;
        meterSelector.add(opt);
    }
}

function setSelectorRanges() {
    const selectorOption = document.getElementById('meterSelector').value;
    const meterDates = store.get('meters')[selectorOption].date;
    // Date selector
    document.getElementById('dateSelector').min = moment(meterDates.min).format("YYYY-MM-DD");
    document.getElementById('dateSelector').max = moment(meterDates.max).format("YYYY-MM-DD");
    document.getElementById('dateSelector').value = moment(meterDates.max).format("YYYY-MM-DD");
    // Interval selector
    document.getElementById('firstDateSelector').min = meterDates.min;
    document.getElementById('firstDateSelector').max = meterDates.max;
    document.getElementById('lastDateSelector').min = meterDates.min;
    document.getElementById('lastDateSelector').max = meterDates.max;
    // Month selector
    document.getElementById('monthSelector').min = moment(meterDates.min).format("YYYY-MM");
    document.getElementById('monthSelector').max = moment(meterDates.max).subtract(1, "months").format("YYYY-MM");
    // Year selector
    document.getElementById('yearSelector').innerHTML =
        "<option value=\"" + moment(meterDates.min).format("YYYY") + "\">" + moment(meterDates.min).format("YYYY") + "</option>";
}

// Run on startup
window.onload = function () {
    setupMeterSelector();
    window.state = States.day;
};

function checkInputs() {
    /**
     * Check the value of each input before allowing a request to be sent
     * **/

    let inputsValid = [];

    inputsValid.push(checkInputAvailable());
    inputsValid.push(checkInputRange());

    return inputsValid.indexOf(false) < 0;
}

// TODO: Refactor
function checkInputAvailable() {
    let valueList = [];

    // Add all values to a list
    valueList.push(document.getElementById("user-selector").value);
    switch (state) {
        case 1: // state = day
            valueList.push(document.getElementById("date-selector").value);
            break;
        case 2: // state = interval
            valueList.push(document.getElementById("first-date-selector").value);
            valueList.push(document.getElementById("last-date-selector").value);
            break;
        case 3: // state = month
            valueList.push(document.getElementById("month-selector").value);
            break;
        case 4: // state = year
            valueList.push(document.getElementById("year-selector").value);
            break;
    }

    return valueList.indexOf("") < 0;   // If at least one value is "", i.e. empty, the comparison returns false
}

function checkInputRange() {
    let selector;

    switch (state) {
        case 1: // state = day
            selector = document.getElementById("date-selector");
            return selector.min <= selector.value && selector.value <= selector.max;
        case 2: // state = interval
            let firstSelector = document.getElementById("first-date-selector");
            let lastSelector = document.getElementById("last-date-selector");
            let firstSelectorValid = firstSelector.min <= firstSelector.value && firstSelector.value <= firstSelector.max;
            let lastSelectorValid = lastSelector.min <= lastSelector.value && lastSelector.value <= lastSelector.max;
            let selectorIntervalValid = firstSelector.value <= lastSelector.value;
            return firstSelectorValid && lastSelectorValid && selectorIntervalValid;
        case 3: // state = month
            selector = document.getElementById("month-selector");
            return selector.min <= selector.value && selector.value <= selector.max;
        case 4: // state = year
            return true;
    }
}
