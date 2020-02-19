const datetimeFormats = Object.freeze({'day': 'LT', 'interval': 'L', 'month': 'L', 'year': 'MMMM'});

// Arrays for chart color storage, will be filled later
window.chartColors = {
    redBorder: "rgb(255, 0, 0)",
    redBackground: "rgba(255, 0, 0, 0.2)",
    orangeBorder: "rgb(255, 128, 0)",
    orangeBackground: "rgba(255, 128, 0, 0.2)",
    blueBorder: "rgb(0, 0, 255)",
    blueBackground: "rgba(0, 0, 255, 0.2)",
    barBackground: [],
    barBorder: [],
};

function initDashboard() {
    moment.locale('de');    // Set Moment.js to german language
    setEventHandlers();
    setChartSettings();
    getMeterData();
}

function setEventHandlers() {
    document.getElementById('meterReadingsButton').onclick = meterReadingsChanged;
    document.getElementById('priceInput').oninput = priceInputChanged;
    document.getElementById('priceInputRange').oninput = priceInputRangeChanged;
    $('#queryModal').on('show.bs.modal', e => {
        document.getElementById('meterSelector').value = window.meterId;
        setSelectorRanges();    // Manual invocation as changing the value doesn't trigger the onchange event
    });

    for (let resSelector of document.getElementsByName('res')) {
        // Cannot use arrow function as "this" represents the function owner, not the function caller
        resSelector.onchange = function () {
            setResolution(this.value);
        }
    }
}

function getMeterData() {
    const url = `/api/${window.mode}/${window.meterId}?${window.params}`;

    function storeMeterData(json) {
        if (typeof (window.meterData) != "undefined") {
            alert("Defined");   // Debugging output
        }
        window.interpolatedDataAvailable = false;
        window.meterData = {
            loadDiffs: [],
            meterReadings: [],
            datetimes: []
        };

        function storeJsonData(d) {
            window.meterData.loadDiffs.push(d['diff']);
            window.meterData.meterReadings.push(d['reading']);
            let datetimeFormat = window.mode === 'day' ? "YYYY-MM-DD HH:mm:SS" : "YYYY-MM-DD";
            window.meterData.datetimes.push(moment(d['datetime'], datetimeFormat));
        }

        // Differentiate between data with or without interpolated data and store the data
        if (Array.isArray(json[0])) {   // Interpolated data available, json[0] is an array
            json[0].forEach(data => {
                storeJsonData(data)
            });
            window.interpolatedDataAvailable = true;
            window.interpolatedData = [];
            json[1].forEach(data => {
                window.interpolatedData.push(data['diff']);
            });
        } else {    // No interpolated data available
            json.forEach(data => {
                storeJsonData(data)
            });
        }

        // Merge interpolated data with load diffs when necessary
        if (interpolatedDataAvailable) {
            window.interpolatedData.forEach((data, idx) => {
                if (data !== 0) {
                    window.meterData.loadDiffs[idx] = data;
                }
            })
        }
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
            updateChart();
            buildTableData();
            calcPrice();
        })
        .catch((err) => {
            console.log(err);
        });
}

/* Chart functions */
function setChartSettings() {
    const ctx = document.getElementById("chart").getContext('2d');
    window.chart = new Chart(ctx, {
        type: "bar",
        data: {
            datasets: [{
                label: "Lastgang",
                backgroundColor: window.chartColors.barBackground,
                borderColor: window.chartColors.barBorder,
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
                        labelString: `Lastgang [${window.unit}]`,
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
                            return tooltipItem.yLabel + ` ${window.unit}`;
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

function updateChart() {
    /**
     * Update the chart according to the current response data
     * **/
    let datetimeData = window.meterData.datetimes;
    let loadDiffsData = window.meterData.loadDiffs;
    let meterReadingsData = window.meterData.meterReadings;
    let interpolatedData;   // Necessary for chart color settings
    if (interpolatedDataAvailable) {
        interpolatedData = window.interpolatedData;   // Used only when data is available
    }

    // Filter meterData for hourly values
    if (window.resolution === 60) {
        let tempDatetime;
        let tempLoadDiffs = [];
        let tempMeterReadings = [];
        // Filter meterData for hourly values
        tempDatetime = datetimeData.filter((d, idx) => {
            if (moment(d).minute() % 60 === 0) {
                tempLoadDiffs.push(loadDiffsData[idx]);
                tempMeterReadings.push(meterReadingsData[idx]);
                return true;
            }
            return false;
        });
        // Filter interpolated data
        if (window.interpolatedDataAvailable) {
            interpolatedData = interpolatedData.filter((d, idx) => {
                return moment(datetimeData[idx]).minute() % 60 === 0;
            });
        }

        datetimeData = tempDatetime;
        loadDiffsData = tempLoadDiffs;
        meterReadingsData = tempMeterReadings;
    }

    // x-Axis values and settings
    let formattedLabels = [];
    if (window.mode === 'interval' || window.mode === 'month') {
        datetimeData.forEach(t => formattedLabels.push(moment(t).format("L")));
    } else if (window.mode === 'year') {
        datetimeData.forEach(t => formattedLabels.push(moment(t).format("MMMM")));
    } else {
        datetimeData.forEach(t => formattedLabels.push(moment(t).format("LT")));
    }
    window.chart.data.labels = formattedLabels;

    // y-Axis values and settings
    window.chart.data.datasets[0].data = loadDiffsData;  // Add loadDiffs to chart
    if (document.getElementById('meterReadingsButton').classList.contains('active')) {
        window.chart.data.datasets[1].data = meterReadingsData;  // Add meterReadings to chart
    }

    // Set chart colors
    for (let i = 0; i < loadDiffsData.length; i++) {
        if (interpolatedDataAvailable && interpolatedData[i] !== 0) {
            window.chartColors.barBorder.push(window.chartColors.redBorder);
            window.chartColors.barBackground.push(window.chartColors.redBackground);
        } else {
            window.chartColors.barBorder.push(window.chartColors.orangeBorder);
            window.chartColors.barBackground.push(window.chartColors.orangeBackground);
        }
    }
    window.chart.update();
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
                backgroundColor: window.chartColors.blueBackground,
                borderColor: window.chartColors.blueBorder,
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

/* Resolution change functions */
function setResolution(res) {
    if (res === "60") {
        window.resolution = 60;
        window.unit = '60 min';
    } else {
        window.resolution = 15;
        window.unit = '15 min';
    }
    updateChart();
    buildTableData();
    calcPrice();
}

function buildTableData() {
    let tableBody = document.getElementById('tbody');
    tableBody.innerHTML = "";   // Clear table

    window.meterData.datetimes.forEach((date, idx) => {

        // Show only hourly values if resolution is set to 60 min
        if (window.resolution === 60 && date.minute() % 60 !== 0) {
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

function calcPrice() {
    let priceCollection = document.getElementsByClassName('cost');
    const diffCollection = document.getElementsByClassName('diff');
    const price = document.getElementById('priceInput').value / 100;

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
