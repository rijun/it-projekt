let myChart;
let state = 1; // 1 - day, 2 - custom, 3 - month, 4 - year
let userList = [];
let requestObj = {};
// Array for storing month names
let monthsList = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
// Array for storing weekday names
let weekdaysList = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

window.onload = function () {
    // Chart setup
    setupChart();
    // Load available users
    loadAvailableUsers();
};

function setupChart() {
    let ctx = document.getElementById("myChart").getContext('2d');
    myChart = new Chart(ctx, {
        type: 'bar',
        // Chart data
        data: {
            datasets: [{
                label: 'Lastgang',
                backgroundColor: "rgba(255, 128, 0, 0.2)",
                borderColor: "rgb(255, 128, 0)",
                borderWidth: 1,
                yAxisID: 'y-axis-load',
            }]
        },
        // Chart options
        options: {
            scales: {
                xAxes: [{
                    scaleLabel: {
                        display: true,
                        labelString: 'Zeitpunkt',
                        fontSize: 14
                    },
                    gridLines: {
                        offsetGridLines: true
                    }
                }],
                yAxes: [{
                    type: 'linear', // only linear but allow scale type registration. This allows extensions to exist solely for log scale for instance
                    display: true,
                    position: 'left',
                    id: 'y-axis-load',
                    scaleLabel: {
                        display: true,
                        labelString: 'Lastgang',
                        fontSize: 14
                    },
                    ticks: {
                        beginAtZero: true
                    }
                }, {
                    type: 'linear', // only linear but allow scale type registration. This allows extensions to  exist solely for log scale for instance
                    display: false,
                    position: 'right',
                    id: 'y-axis-energy',
                    scaleLabel: {
                        display: true,
                        labelString: 'Zählerstand [kWh]',
                        fontSize: 14
                    },
                    gridLines: {
                        drawOnChartArea: false, // only want the grid lines for one axis to show up
                    }
                }]
            },
            tooltips: {
                mode: 'index',
                callbacks: {
                    label: function (tooltipItem, data) {
                        if (tooltipItem.datasetIndex === 0) {
                            return tooltipItem.yLabel + " " + currentUnit();
                        } else {
                            return tooltipItem.yLabel + " kWh";
                        }
                    },
                    // Use the footer callback to display the sum of the items showing in the tooltip
                    footer: function (tooltipItem, data) {
                        let kwhPrice;
                        let load = tooltipItem[0].yLabel;
                        let price = document.getElementById("price-select").value / 100;
                        kwhPrice = calculatePrice(load, price);
                        return "Kosten: " + kwhPrice + " €";
                    },
                },
                footerFontStyle: 'normal'
            }
        }
    });
}

// Request data from server and process it
function requestData() {
    document.getElementById("placeholder").style.display = "none";
    document.getElementById("content").style.display = "block";

    let http = new XMLHttpRequest();

    http.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {   // Response OK
            updatePage(JSON.parse(this.responseText));
        } else if (this.readyState == 4 && this.status == 404) {    // Response failed
            window.alert(this.responseText);
        }
    };

    // Generate URL arguments
    let urlArguments = createArguments()

    http.open("GET", "http://localhost:5000/data?" + urlArguments, true);
    http.send();
}

// Update and plot chart
function updatePage(response) {
    // Store response values
    requestObj.labels = response['times'];
    requestObj.loadDiffs = response['energy_diffs'];
    requestObj.meterReadings = response['meter_readings'];
    requestObj.avgKwh = response['avg'];
    requestObj.maxKwh = response['max'];
    requestObj.minKwh = response['min'];
    requestObj.sumKwh = response['sum'];
    // Get current kWh price
    let price = document.getElementById("price-select").value / 100;

    // Update page contents
    updateHeader();
    updateChart();
    updateTable(price);
    updateStatistics(price);

    let meterNumber = document.getElementById("user-selector").value;
    if (meterNumber === "default") { // Do nothing if no user is selected
        document.getElementById("user-info").innerHTML = "";
        return;
    }
    let user = null;
    userList.forEach(u => {
        if (u["number"] === meterNumber) {
            user = u;
        }
    });
    document.getElementById("user-info").innerHTML = user["firstname"] + " " + user["lastname"] + " - " + user["city"] + " (" + user["zipcode"] + ")";
}

// Adjust UI depending on selected mode
function modeChanged() {
    const modeSelector = document.getElementById('mode-selector');
    if (modeSelector.value === "day") {
        document.getElementById("day-options").style.display = "block";
        document.getElementById("interval-options").style.display = "none";
        document.getElementById("month-options").style.display = "none";
        document.getElementById("year-options").style.display = "none";
        state = 1; // Set state to day
    } else if (modeSelector.value === "interval") {
        document.getElementById("day-options").style.display = "none";
        document.getElementById("interval-options").style.display = "block";
        document.getElementById("month-options").style.display = "none";
        document.getElementById("year-options").style.display = "none";
        state = 2; // Set state to custom
    } else if (modeSelector.value === "month") {
        document.getElementById("day-options").style.display = "none";
        document.getElementById("interval-options").style.display = "none";
        document.getElementById("month-options").style.display = "block";
        document.getElementById("year-options").style.display = "none";
        state = 3; // Set state to month
    } else {
        document.getElementById("day-options").style.display = "none";
        document.getElementById("interval-options").style.display = "none";
        document.getElementById("month-options").style.display = "none";
        document.getElementById("year-options").style.display = "block";
        state = 4; // Set state to year
    }
}

function formatNumber(number) {
    return Number.parseFloat(number).toFixed(2);
}

function priceChanged() {
    let currentPrice = document.getElementById("price-select").value / 100;
    document.getElementById("price-val").innerText = currentPrice.toFixed(2);
    document.getElementById("stat-price").innerText = formatNumber(requestObj.sumKwh * currentPrice);
    updateTable(currentPrice);
}

function calculatePrice(load, price) {
    let money;

    switch (state) {
        case 1:
            money = load * price / 60 * document.getElementById("resolution-selector").value;
            break;
        case 2:
            money = load * price / 24;
            break;
        case 3:
            money = load * price / 24;
            break;
        case 4:
            money = load * price / 60 * document.getElementById("resolution-selector").value;
            break;
    }

    return money.toFixed(3)
}

function loadAvailableUsers() {
    let http = new XMLHttpRequest();
    http.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            let response = JSON.parse(this.responseText);
            response['users'].forEach(u => userList.push(u));   // Store users in array
            let userSelector = document.getElementById("user-selector");
            let userInfo = document.getElementById("user-list-all");
            userList.forEach(u =>
                userSelector.innerHTML += "<option value=\"" + u["number"] + "\">" + u["number"] +
                    "</option>");
            userList.forEach(u =>
                userInfo.innerHTML += "<li>" + u["number"] + " - " + u["firstname"] + " " + u["lastname"] + ", " + u["city"] + " (" + u["zipcode"] + ")"
            )
        }
    };

    http.open("GET", "http://localhost:5000/boot", true);
    http.send();
}

function updateUserInformation() {
    let userSelector = document.getElementById('user-selector');
    if (userSelector[0].value === "default") {
        userSelector[0].remove();
    }
    let http = new XMLHttpRequest();
    http.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            // Clear user selector on first run
            let response = JSON.parse(this.responseText);
            let maxDate = response['max_date'];
            let minDate = response['min_date'];
            document.getElementById('date-selector').max = maxDate;
            document.getElementById('date-selector').min = minDate;
            document.getElementById('first-date-selector').max = maxDate;
            document.getElementById('first-date-selector').min = minDate;
            document.getElementById('last-date-selector').max = maxDate;
            document.getElementById('last-date-selector').min = minDate;
            document.getElementById('month-selector').max = maxDate.match(/(\d+-\d+)(?=-)/g);
            document.getElementById('month-selector').min = minDate.match(/(\d+-\d+)(?=-)/g);
            document.getElementById('year-selector').innerHTML = "<option value=\"" +
                minDate.match(/(\d\d\d\d)(?=-)/g) + "\">" + minDate.match(/(\d\d\d\d)(?=-)/g) +
                "</option>";
        }
    };

    http.open("GET", "http://localhost:5000/users?u=" + userSelector.value, true);
    http.send();
}

function increaseDate() {
    let date = new Date(document.getElementById('date-selector').value);
    date.setDate(date.getDate() + 1);
    document.getElementById('date-selector').value = date.toISOString().substring(0, 10);
    requestData();
}

function decreaseDate() {
    let date = new Date(document.getElementById('date-selector').value);
    date.setDate(date.getDate() - 1);
    document.getElementById('date-selector').value = date.toISOString().substring(0, 10);
    requestData();
}

function increaseMonth() {
    let month = new Date(document.getElementById('month-selector').value);
    let currentMonth = month.getMonth();
    let nextMonth = currentMonth + 1;
    month.setMonth(nextMonth);
    document.getElementById('month-selector').value = month.toISOString().substring(0, 7);
    requestData();
}

function decreaseMonth() {
    let month = new Date(document.getElementById('month-selector').value);
    let currentMonth = month.getMonth();
    let nextMonth = currentMonth - 1;
    month.setMonth(nextMonth);
    document.getElementById('month-selector').value = month.toISOString().substring(0, 7);
    requestData();
}

function meterReadingsViewChanged(cb) {
    if (cb.checked) {
        if (myChart.data.datasets.length === 1) {
            myChart.data.datasets.push({
                label: 'Zählerstand',
                data: requestObj.meterReadings,
                backgroundColor: "rgba(255, 0, 0, 0.2)",
                borderColor: "rgb(255, 0, 0)",
                borderWidth: 1,
                type: "line",
                yAxisID: 'y-axis-energy'
            });
            myChart.options.scales.yAxes[1].display = true;
        } else {
            myChart.data.datasets[1].data = requestObj.meterReadings;
        }
    } else if (myChart.data.datasets.length === 2) {
        myChart.data.datasets.pop();
        myChart.options.scales.yAxes[1].display = false;
    }
    myChart.update();
}

/** Update functions **/
function updateHeader() {
    switch (state) {
        case 1:
            let date = new Date(document.getElementById("date-selector").value);
            document.getElementById("title").innerText = weekdaysList[date.getDay()] + ", der " +
                String(date.getDate()).padStart(2, '0') + ". " + monthsList[date.getMonth()] +
                " " + date.getFullYear();
            break;
        case 2:
            let firstDate = new Date(document.getElementById("first-date-selector").value);
            let lastDate = new Date(document.getElementById("last-date-selector").value);
            document.getElementById("title").innerText = String(firstDate.getDate()).padStart(2, '0') + ". " +
                monthsList[firstDate.getMonth()] + " " + firstDate.getFullYear() + " - " + String(lastDate.getDate()).padStart(2, '0') +
                ". " + monthsList[lastDate.getMonth()] + " " + lastDate.getFullYear();
            break;
        case 3:
            let month = new Date(document.getElementById("month-selector").value);
            document.getElementById("title").innerText = monthsList[month.getMonth()] + " " + month.getFullYear();
            break;
        case 4:
            let year = new Date(document.getElementById("year-selector").value);
            document.getElementById("title").innerText = "Lastgang vom Jahr " + year.getFullYear();
            break;
    }

    if (state === 1) {
        document.getElementById("prev").style.display = "inline";
        document.getElementById("next").style.display = "inline";
        document.getElementById("prev-button").setAttribute("onclick", "decreaseDate()");
        document.getElementById("next-button").setAttribute("onclick", "increaseDate()");
    } else if (state === 3) {
        document.getElementById("prev").style.display = "inline";
        document.getElementById("next").style.display = "inline";
        document.getElementById("prev-button").setAttribute("onclick", "decreaseMonth()");
        document.getElementById("next-button").setAttribute("onclick", "increaseMonth()");
    } else {
        document.getElementById("prev").style.display = "none";
        document.getElementById("next").style.display = "none";
    }
}

function updateChart() {
    switch (state) {
        case 1:
            myChart.data.labels = requestObj.labels;
            break;
        case 2:
        case 3:
            myChart.data.labels = formatDays(requestObj.labels);
            break;
        case 4:
            myChart.data.labels = formatMonths(requestObj.labels)
    }
    myChart.data.datasets[0].data = requestObj.loadDiffs;
    if (document.getElementById('meter-readings-view').checked) {
        myChart.data.datasets[1].data = requestObj.meterReadings;
    }
    myChart.options.scales.yAxes[0].scaleLabel.labelString = "Lastgang [" + currentUnit() + "]";
    myChart.update();
}

function updateTable(kwhPrice) {
    let tableData = "<table class=\"table table-striped table-sm table-hover text-center\"><tr class=\"d-flex\">" +
        "<th id=\"datetime-title\" class=\"col\"></th><th class=\"col\">Lastgang [" + currentUnit() + "]</th>" +
        "<th class=\"col\">Zählerstand [kWh] </th><th class=\"col\">Kosten [€]</th></tr>";
    for (let index in requestObj.labels) {
        tableData += "<tr class=\"d-flex\"><td class=\"col\">" + formatLabel(requestObj.labels[index]) + "</td><td class=\"col\">" +
            formatNumber(requestObj.loadDiffs[index]) + "</td><td class=\"col\">" +
            formatNumber(requestObj.meterReadings[index]) + "</td><td class=\"col\">" +
            calculatePrice(requestObj.loadDiffs[index], kwhPrice) + " €</td></tr>";
    }
    tableData += "</table>";
    document.getElementById("data-table").innerHTML = tableData;
    let title = document.getElementById('datetime-title');
    switch (state) {
        case 1:
            title.innerText = "Uhrzeit";
            break;
        case 2:
        case 3:
            title.innerText = "Datum";
            break;
        case 4:
            title.innerText = "Monat"
    }
}

function updateStatistics(kwhPrice) {
    document.getElementById("stat").style.display = "block";
    document.getElementById("stat-data").innerHTML = "<li class=\"mb-3\"><h6>Durchschnittsverbrauch</h6>" +
        requestObj.avgKwh + " " + currentUnit() + "</li>";
    document.getElementById("stat-data").innerHTML += "<li class=\"mb-3\"><h6>Maximalverbrauch</h6>" +
        requestObj.maxKwh + " " + currentUnit() + "</li>";
    document.getElementById("stat-data").innerHTML += "<li class=\"mb-3\"><h6>Minimalverbrauch</h6>" +
        requestObj.minKwh + " " + currentUnit() + "</li>";
    document.getElementById("stat-data").innerHTML += "<li class=\"mb-3\"><h6>Gesamtverbrauch</h6>" +
        requestObj.sumKwh + " kWh</li>";
    document.getElementById("stat-data").innerHTML += "<li class=\"mb-3\"><h6>Gesamtkosten</h6>" +
        "<span id=\"stat-price\">" + formatNumber(requestObj.sumKwh * kwhPrice) + "</span> €</li>";
}

/** Helper functions **/

function createArguments() {
    let arguments = "u=" + document.getElementById("user-selector").value;
    switch (state) {
        case 1: // Day query
            arguments += "&mode=" + document.getElementById("mode-selector").value +
                "&d=" + document.getElementById("date-selector").value +
                "&r=" + document.getElementById("resolution-selector").value;
            break;
        case 2: // Interval query
            arguments += "&mode=" + document.getElementById("mode-selector").value +
                "&sd=" + document.getElementById("first-date-selector").value +
                "&ed=" + document.getElementById("last-date-selector").value;
            break;
        case 3:
            arguments += "&mode=" + document.getElementById("mode-selector").value +
                "&m=" + document.getElementById("month-selector").value;
            break;
        case 4:
            arguments += "&mode=" + document.getElementById("mode-selector").value +
                "&y=" + document.getElementById("year-selector").value;
            break;
    }
    return arguments;
}

function currentUnit() {
    let unit = "";
    switch (state) {
        case 1:
            if (document.getElementById("resolution-selector").value === "15") {
                unit = "kWh / Viertelstunde";
            } else {
                unit = "kWh / Stunde";
            }
            break;
        case 2:
            unit = "kWh / Tag";
            break;
        case 3:
            unit = "kWh / Tag";
            break;
        case 4:
            unit = "kWh / Monat";
            break;
    }
    return unit;
}

function formatDays(days) {
    let returnDays = [];
    days.forEach(d => {
        let date = new Date(d);
        let returnDate = String(date.getDate()).padStart(2, '0') + "."
            + String(date.getMonth() + 1).padStart(2, '0');
        returnDays.push(returnDate);
    });
    return returnDays;
}

function formatMonths(months) {
    let returnMonths = [];
    months.forEach(m => {
        let month = new Date(m);
        let returnMonth = monthsList[month.getMonth()]
        returnMonths.push(returnMonth);
    });
    return returnMonths;
}

function formatLabel(label) {
    switch (state) {
        case 1:
            return label;
        case 2:
        case 3:
            let d = new Date(label);
            return String(d.getDate()).padStart(2, '0') + "." + String(d.getMonth() + 1)
                .padStart(2, '0') + "." + d.getFullYear();
        case 4:
            let m = new Date(label);
            return monthsList[m.getMonth()];
    }
}