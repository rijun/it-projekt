const datetimeFormats = Object.freeze({'day': 'LT', 'interval': 'L', 'month': 'L', 'year': 'YYYY'});

function initDashboard() {
    moment.locale('de');    // Set Moment.js to german language
    window.resolution = 60; // Used only in day mode
    setEventHandlers();
    getMeterData();
}

function setEventHandlers() {
    document.getElementById('meterReadingsButton').onclick = meterReadingsChanged;
    document.getElementById('priceInput').oninput = priceInputChanged;
    document.getElementById('priceInputRange').oninput = priceInputRangeChanged;

    for (let resSelector of document.getElementsByName('res')) {
        // Cannot use arrow function as "this" represents the function owner, not the function caller
        resSelector.onchange = function () {
            setResolution(this.value);
        }
    }
}

function getMeterData() {
    const url = `/meters/${window.mode}/${window.meterId}?d=${window.date}`;

    function storeMeterData(json) {
        if (typeof window.meterData != "undefined") {
            console.log("Defined");
        }
        window.meterData = {
            loadDiffs: [],
            meterReadings: [],
            datetimes: []
        };
        json.forEach(data => {
            window.meterData.loadDiffs.push(data['diff']);
            window.meterData.meterReadings.push(data['reading']);
            let datetimeFormat = window.mode === 'day' ? "YYYY-MM-DD HH:mm:SS" : "YYYY-MM-DD";
            window.meterData.datetimes.push(moment(data['datetime'], datetimeFormat));
        });
    }

    fetch(url, {method: 'get'})
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                console.log(response);
                throw new Error('Something went wrong');
            }
        })
        .then(json => {
            storeMeterData(json);
            makeChart();
            buildTableData();
            calcPrice(document.getElementById('priceInput').value);
        })
        .catch((err) => {
            console.log(err);
        });
}

/* Chart functions */
function makeChart() {
    /**
     * Update the chart according to the current response data
     * **/
    return;
    setChartSettings();

    // let requestData = {{ g.data['meter_data']|tojson }};
    window.meterData = {  // Object for storing meter_id data
        datetimes: [],
        loadDiffs: [],
        meterReadings: [],
        hour: {
            datetimes: [],
            loadDiffs: [],
            meterReadings: []
        },
        quarter: {
            datetimes: [],
            loadDiffs: [],
            meterReadings: []
        }
    };

    requestData.forEach(d => {
        window.meterData.quarter.datetimes.push(d.datetime);
        window.meterData.quarter.loadDiffs.push(d.diff);
        window.meterData.quarter.meterReadings.push(d.reading);

        if (moment(d.datetime).minute() % 60 === 0) {
            window.meterData.hour.datetimes.push(d.datetime);
            window.meterData.hour.loadDiffs.push(d.diff);
            window.meterData.hour.meterReadings.push(d.reading);
        }
    });

    if (window.resolution === 60) {
        window.meterData.datetimes = window.meterData.hour.datetimes;
        window.meterData.loadDiffs = window.meterData.hour.loadDiffs;
        window.meterData.meterReadings = window.meterData.hour.meterReadings;
    } else {
        window.meterData.datetimes = window.meterData.quarter.datetimes;
        window.meterData.loadDiffs = window.meterData.quarter.loadDiffs;
        window.meterData.meterReadings = window.meterData.quarter.meterReadings;
    }

    setResInputEvents();

    // x-Axis values and settings
    let formattedLabels = [];
    // {% if g.mode == 'interval' or g.mode == 'month' %}
    //     window.meterData.datetimes.forEach(t => formattedLabels.push(moment(t).format("L")));
    // {% elif g.mode == 'year' %}
    //     window.meterData.datetimes.forEach(t => formattedLabels.push(moment(t).format("MMMM")));
    // {% else %}
    //     window.meterData.datetimes.forEach(t => formattedLabels.push(moment(t).format("LT")));
    // {% endif %}
    window.chart.data.labels = formattedLabels;

    // y-Axis values and settings
    window.chart.data.datasets[0].data = window.meterData.loadDiffs;  // Add loadDiffs to chart
    if (document.getElementById('meterReadingsButton').classList.contains('active')) {
        window.chart.data.datasets[1].data = window.meterData.meterReadings;  // Add meterReadings to chart
    }
    window.chart.update();
}

function setChartSettings() {
    /**
     * Setup chart with the settings stored in the chart_settings.js file
     * **/

    const ctx = document.getElementById("chart").getContext('2d');
    window.chart = new Chart(ctx, {
        type: "bar",
        data: {
            datasets: [{
                label: "Lastgang",
                backgroundColor: "rgba(255, 128, 0, 0.2)",
                borderColor: "rgb(255, 128, 0)",
                borderWidth: 1,
                yAxisID: "y-axis-load",
            }]
        },
        options: {
            scales: {
                xAxes: [{
                    scaleLabel: {
                        display: true,
                        labelString: "Zeitpunkt",
                    },
                    gridLines: {
                        offsetGridLines: true
                    }
                }],
                yAxes: [{
                    type: "linear",
                    display: true,
                    position: "left",
                    id: "y-axis-load",
                    scaleLabel: {
                        display: true,
                        labelString: "Lastgang [{{ unit }}]",
                    },
                    ticks: {
                        beginAtZero: true
                    }
                }, {
                    type: "linear",
                    display: false,
                    position: "right",
                    id: "y-axis-energy",
                    scaleLabel: {
                        display: true,
                        labelString: "Zählerstand [kWh]",
                    },
                    gridLines: {
                        drawOnChartArea: false,
                    }
                }]
            },
            tooltips: {
                mode: "index",
                // Custom tooltip settings
                callbacks: {
                    label: function (tooltipItem, data) {
                        if (tooltipItem.datasetIndex === 0) {
                            return tooltipItem.yLabel + ' {{ unit }}';
                        } else {
                            return tooltipItem.yLabel + " kWh";
                        }
                    },
                    footer: function (tooltipItem, data) {
                        let kwhPrice;
                        let load = tooltipItem[0].yLabel;
                        let price = document.getElementById("priceInput").value / 100;
                        // let price = 0.3;
                        // kwhPrice = calculatePrice(load, price);

                        if (mode === 'interval' || mode === 'month') {
                            kwhPrice = load * price / 24;
                        } else if (mode === 'year') {
                            kwhPrice = load * price / 12;
                        } else {
                            kwhPrice = load * price / 60 * window.resolution;
                        }

                        return "Kosten: " + kwhPrice.toFixed(2) + ' €';
                    },
                },
                footerFontStyle: "normal"
            }
        }
    });
}

function meterReadingsChanged() {
    /**
     * Add and remove the meter_id value line graph from the chart
     * **/

    if (!document.getElementById('meterReadingsButton').classList.contains('active')) { // Add line graph
        if (window.chart.data.datasets.length === 1) {   // Add line graph if not already in chart
            window.chart.data.datasets.push({
                label: 'Zählerstand',
                data: window.meterData.meterReadings,
                backgroundColor: "rgba(255, 0, 0, 0.2)",
                borderColor: "rgb(255, 0, 0)",
                borderWidth: 1,
                type: "line",
                yAxisID: 'y-axis-energy'
            });
            window.chart.options.scales.yAxes[1].display = true;
        } else {
            window.chart.data.datasets[1].data = window.meterData.meterReadings;  // Update line graph values if already in chart
        }
    } else if (window.chart.data.datasets.length === 2) {    // Remove line graph if already in chart
        window.chart.data.datasets.pop();
        window.chart.options.scales.yAxes[1].display = false;
    }

    window.chart.update();
}

/* Resolution functions */
function setResolution(res) {
    if (res === "60") {
        window.meterData.datetimes = window.meterData.hour.datetimes;
        window.meterData.loadDiffs = window.meterData.hour.loadDiffs;
        window.meterData.meterReadings = window.meterData.hour.meterReadings;
    } else {
        window.meterData.datetimes = window.meterData.quarter.datetimes;
        window.meterData.loadDiffs = window.meterData.quarter.loadDiffs;
        window.meterData.meterReadings = window.meterData.quarter.meterReadings;
    }
    let formattedLabels = [];
    window.meterData.datetimes.forEach(t => formattedLabels.push(moment(t).format("LT")));
    window.chart.data.labels = formattedLabels;
    window.chart.data.datasets[0].data = window.meterData.loadDiffs;
    if (window.chart.data.datasets.length === 2) {
        window.chart.data.datasets[1].data = window.meterData.meterReadings;
    }
    window.chart.update();
    buildTableData(res)
}

function buildTableData(res = "60") {
    let tableBody = document.getElementById('tbody');

    window.meterData.datetimes.forEach((date, idx) => {

        // Show only hourly values if resolution is set to 60 min
        if (res === '60' && date.minute() % 60 !== 0) {
            return;
        }

        let tr = document.createElement('tr');
        tr.classList.add('d-flex');
        for (let i = 0; i < 4; i++) {
            tr.appendChild(document.createElement('td')).classList.add('col');
        }
        tr.cells[0].appendChild(document.createTextNode(date.format(datetimeFormats[window.mode])));
        tr.cells[1].appendChild(document.createTextNode(window.meterData.loadDiffs[idx].toFixed(2)));
        tr.cells[1].classList.add('diff');
        tr.cells[2].appendChild(document.createTextNode(window.meterData.meterReadings[idx].toFixed(2)));
        tr.cells[3].appendChild(document.createTextNode('-,--'));
        tr.cells[3].classList.add('cost');
        tableBody.appendChild(tr);
    });
}

/* Price functions */
function priceInputChanged() {
    const currentVal = document.getElementById('priceInput').value;
    document.getElementById('priceInputRange').value = currentVal;
    calcPrice(currentVal);
}

function priceInputRangeChanged() {
    const currentVal = document.getElementById('priceInputRange').value;
    document.getElementById('priceInput').value = currentVal;
    calcPrice(currentVal);
}

function calcPrice(val) {
    let priceCollection = document.getElementsByClassName('cost');
    const diffCollection = document.getElementsByClassName('diff');
    const price = val / 100;

    let priceSum = price * window.sum;
    document.getElementById('cost').innerText = `${priceSum.toFixed(2)} €`;

    for (let i = 0; i < priceCollection.length; i++) {
        let cost = 0.0;

        if (window.mode === 'interval' || window.mode === 'month') {
            cost = parseFloat(diffCollection[i].innerHTML) * price / 24;
        } else if (window.mode === 'year') {
            cost = parseFloat(diffCollection[i].innerHTML) * price / 12;
        } else {
            cost = parseFloat(diffCollection[i].innerHTML) * price / 60 * window.resolution;
        }

        priceCollection[i].innerHTML = cost.toFixed(3)
    }
}
