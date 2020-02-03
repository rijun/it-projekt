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
