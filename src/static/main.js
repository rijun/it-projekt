// Event handlers
document.getElementById('sendButton').onclick = () => {
    getMeterData();
    $('#queryModal').modal('hide');
    document.getElementById('meterSelection').classList.add('d-none');
    document.getElementById('meterDisplay').classList.remove('d-none');
};

document.getElementById('meterSelector').onchange = setSelectorRanges;

// Setup functions
function setupMeterSelector() {
    let meterSelector = document.getElementById('meterSelector');
    for (let meter in window.meters) {
        let opt = document.createElement('option');
        opt.value = meter;
        opt.innerHTML = meter;
        meterSelector.add(opt);
    }
}

function setMeterButtonEvents() {
    const meterButtonList = document.getElementsByClassName('meter');
    for (let meterButton of meterButtonList) {
        // Cannot use arrow function as "this" represents the function owner, not the function caller
        meterButton.onclick = function() {
            document.getElementById('showModalButton').click();
            document.getElementById('meterSelector').value = this.id;
            setSelectorRanges();    // Manual invocation as changing the value doesn't trigger the onchange event
        }
    }
}

function setSelectorRanges() {
    const selectorOption = document.getElementById('meterSelector').value;
    const meterDates = window.meters[selectorOption].date;
    // Date selector
    document.getElementById('dateSelector').min = moment(meterDates.min).format("YYYY-MM-DD");
    document.getElementById('dateSelector').max = moment(meterDates.max).format("YYYY-MM-DD");
    document.getElementById('dateSelector').value = moment(meterDates.max).format("YYYY-MM-DD");
    // Interval selector
    document.getElementById('first-date-selector').min = meterDates.min;
    document.getElementById('first-date-selector').max = meterDates.max;
    document.getElementById('last-date-selector').min = meterDates.min;
    document.getElementById('last-date-selector').max = meterDates.max;
    // Month selector
    document.getElementById('month-selector').min = moment(meterDates.min).format("YYYY-MM");
    document.getElementById('month-selector').max = moment(meterDates.max).subtract(1, "months").format("YYYY-MM");
    // Year selector
    document.getElementById('year-selector').innerHTML =
        "<option value=\"" + moment(meterDates.min).format("YYYY") + "\">" + moment(meterDates.min).format("YYYY") + "</option>";
}

function setupChart() {
    /**
     * Setup chart with the settings stored in the chart_settings.js file
     * **/

    const ctx = document.getElementById("chart").getContext('2d');
    window.chart = new Chart(ctx, chartSettings);
}

// Run on startup
window.onload = function () {
    moment.locale('de');    // Set Moment.js to german language
    addMetersToStorage();
    setupMeterSelector();
    setMeterButtonEvents();
    setupChart();
};

function getMeterData() {
    const meterId = document.getElementById('meterSelector').value;
    const mode = document.getElementById('modeSelector').value;
    const date = document.getElementById('dateSelector').value;
    const res = document.getElementById('resSelector').value;

    const url = '/meter' + '/' + meterId + '/' + mode + '?d=' + date + '&r=' + res;

    fetch(url, {
        method: 'get'
    }).then(response => {
        return response.json();
    }).then(json => {
        console.log(json);
    });
}
