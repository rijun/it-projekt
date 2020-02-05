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
function initMeterSelector() {
    let meterSelector = document.getElementById('meterSelector');
    // Set event handlers
    meterSelector.onchange = setSelectorRanges;
    // Add available meters to meter selector
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
    document.getElementById('dateSelector').disabled = false;
    // Interval selector
    document.getElementById('firstDateSelector').min = meterDates.min;
    document.getElementById('firstDateSelector').max = meterDates.max;
    document.getElementById('firstDateSelector').disabled = false;
    document.getElementById('lastDateSelector').min = meterDates.min;
    document.getElementById('lastDateSelector').max = meterDates.max;
    document.getElementById('lastDateSelector').disabled = false;
    // Month selector
    document.getElementById('monthSelector').min = moment(meterDates.min).format("YYYY-MM");
    document.getElementById('monthSelector').max = moment(meterDates.max).subtract(1, "months").format("YYYY-MM");
    document.getElementById('monthSelector').disabled = false;
    // Year selector
    const yearSelector = document.getElementById('yearSelector');
    yearSelector.innerHTML = "";
    const startYear = moment(meterDates.min);
    const endYear = moment(meterDates.max);
    while (endYear.diff(startYear, 'years') >= 0) {
        const yearStr =  startYear.format("YYYY");
        yearSelector.innerHTML += "<option value=\"" + yearStr + "\">" + yearStr + "</option>";
        if (endYear.diff(startYear, 'years') === 0) {
            break;
        } else {
             startYear.add(1, 'year');
        }
    }
    document.getElementById('yearSelector').disabled = false;
}
