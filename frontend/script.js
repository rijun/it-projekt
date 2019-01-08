const monthsList = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const weekdaysList = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

let myChart;
let state = 1;          // 1 - day, 2 - interval, 3 - month, 4 - year
let userList = [];      // List for storing all available users
let responseObj = {};   // Object for storing the response values

window.onload = function () {
    setupChart();
    loadAvailableUsers();
};

function setupChart() {
    /**
     * Setup chart with the settings stored in the chart_settings.js file
     * **/

    let ctx = document.getElementById("myChart").getContext('2d');
    myChart = new Chart(ctx, chartSettings);
}

function loadAvailableUsers() {
    /**
     * Load all users which are available in the database
     * **/

    let http = new XMLHttpRequest();

    http.onreadystatechange = function () {
        parseUserResponse.call(this);
    };

    http.open("GET", "http://localhost:5000/users", true);
    http.send();
}

function requestData() {
    /**
     * Request the specified data from the server and parse the response
     * **/

    if (!checkSelections()) {   // Check if user has selected something
        return;
    }

    // Hide welcome screen
    document.getElementById("placeholder").style.display = "none";
    document.getElementById("content").style.display = "block";

    let http = new XMLHttpRequest();

    http.onreadystatechange = function () {
        parseDataResponse.call(this);
    };

    let urlArguments = createArguments();

    http.open("GET", "http://localhost:5000/data?" + urlArguments, true);
    http.send();
}

function updatePage() {
    /**
     * Update the page according to the received response
     * **/

    let price = document.getElementById("price-select").value / 100;    // Get current kWh price

    // Update page contents
    updateHeader();
    updateChart();
    updateTable(price);
    updateStatistics(price);
}

function updateHeader() {
    /**
     * Update the header according to the current response data
     * **/

    switch (state) {
        case 1: // state = day
            let date = new Date(document.getElementById("date-selector").value);
            buildDateHeader(date);
            break;
        case 2: // state = interval
            let firstDate = new Date(document.getElementById("first-date-selector").value);
            let lastDate = new Date(document.getElementById("last-date-selector").value);
            buildIntervalHeader(firstDate, lastDate);
            break;
        case 3: // state = month
            let month = new Date(document.getElementById("month-selector").value);
            buildMonthHeader(month);
            break;
        case 4: // state = year
            let year = new Date(document.getElementById("year-selector").value);
            buildYearHeader(year);
            break;
    }

    checkNavArrowsRange();  // Disable prev/next arrows if the current date is the last available date
    buildUserHeader();
}

function buildDateHeader(date) {
    document.getElementById("title").innerText =
        weekdaysList[date.getDay()] + ", der " + String(date.getDate()).padStart(2, '0') + ". "
        + monthsList[date.getMonth()] + " " + date.getFullYear();
    showDayNavArrows();
}

function buildIntervalHeader(firstDate, lastDate) {
    document.getElementById("title").innerText =
        String(firstDate.getDate()).padStart(2, '0')
        + ". " + monthsList[firstDate.getMonth()] + " " + firstDate.getFullYear() + " - "
        + String(lastDate.getDate()).padStart(2, '0') + ". " + monthsList[lastDate.getMonth()] + " "
        + lastDate.getFullYear();
    hideNavArrows();
}

function buildMonthHeader(month) {
    document.getElementById("title").innerText = monthsList[month.getMonth()] + " " + month.getFullYear();
    showMonthNavArrows();
}

function buildYearHeader(year) {
    document.getElementById("title").innerText = "Lastgang vom Jahr " + year.getFullYear();
    hideNavArrows();
}

function showDayNavArrows() {
    document.getElementById("prev").style.display = "inline";
    document.getElementById("next").style.display = "inline";
    document.getElementById("prev-button").setAttribute("onclick", "decreaseDate()");
    document.getElementById("next-button").setAttribute("onclick", "increaseDate()");
}

function showMonthNavArrows() {
    document.getElementById("prev").style.display = "inline";
    document.getElementById("next").style.display = "inline";
    document.getElementById("prev-button").setAttribute("onclick", "decreaseMonth()");
    document.getElementById("next-button").setAttribute("onclick", "increaseMonth()");
}

function hideNavArrows() {
    document.getElementById("prev").style.display = "none";
    document.getElementById("next").style.display = "none";
}

function checkNavArrowsRange() {
    let datetimeSelector;

    if (state === 1) {  // state = day
        datetimeSelector = document.getElementById('date-selector');
    } else if (state === 3) {   // state = month
        datetimeSelector = document.getElementById('month-selector');
    }

    checkDateRange(datetimeSelector);
}

function checkDateRange(selector) {
    if (selector.value === selector.max) {
        document.getElementById("next-button").style.display = "none";
    }
    else if (selector.value === selector.min) {
        document.getElementById("prev-button").style.display = "none";
    } else {
        document.getElementById("next-button").style.display = "inline";
        document.getElementById("prev-button").style.display = "inline";
    }
}

function buildUserHeader() {
    let meterNumber = document.getElementById("user-selector").value;
    let user = null;
    userList.forEach(u => {
        if (u["number"] === meterNumber) {
            user = u;
        }
    });
    document.getElementById("user-info").innerHTML =
        user["firstname"] + " " + user["lastname"] + " - " + user["city"] + " (" + user["zipcode"] + ")";
}

function updateChart() {
    /**
     * Update the chart according to the current response data
     * **/

    assignChartXValues();
    assignChartYValues();
    myChart.update();
}

function assignChartXValues() {
    switch (state) {
        case 1: // state = day
            myChart.data.labels = responseObj.labels;
            break;
        case 2: // state = interval
        case 3: // state = month
            myChart.data.labels = formatDays(responseObj.labels);
            break;
        case 4: // state = year
            myChart.data.labels = formatMonths(responseObj.labels)
    }
}

function assignChartYValues() {
    myChart.data.datasets[0].data = responseObj.loadDiffs;  // Add loadDiffs to chart

    if (document.getElementById('meter-readings-selector').checked) {
        myChart.data.datasets[1].data = responseObj.meterReadings;  // Add meterReadings to chart
    }

    myChart.options.scales.yAxes[0].scaleLabel.labelString = "Lastgang [" + getCurrentUnit() + "]";
}

function updateTable(kwhPrice) {
    let tableData = "<table class=\"table table-striped table-sm table-hover text-center\"><tr class=\"d-flex\">" +
        "<th id=\"datetime-title\" class=\"col\"></th><th class=\"col\">Lastgang [" + getCurrentUnit() + "]</th>" +
        "<th class=\"col\">Zählerstand [kWh] </th><th class=\"col\">Kosten [€]</th></tr>";
    for (let index in responseObj.labels) {
        tableData += "<tr class=\"d-flex\"><td class=\"col\">" + formatLabel(responseObj.labels[index]) + "</td><td class=\"col\">" +
            formatNumber(responseObj.loadDiffs[index]) + "</td><td class=\"col\">" +
            formatNumber(responseObj.meterReadings[index]) + "</td><td class=\"col\">" +
            calculatePrice(responseObj.loadDiffs[index], kwhPrice) + " €</td></tr>";
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
        responseObj.avgKwh + " " + getCurrentUnit() + "</li>";
    document.getElementById("stat-data").innerHTML += "<li class=\"mb-3\"><h6>Maximalverbrauch</h6>" +
        responseObj.maxKwh + " " + getCurrentUnit() + "</li>";
    document.getElementById("stat-data").innerHTML += "<li class=\"mb-3\"><h6>Minimalverbrauch</h6>" +
        responseObj.minKwh + " " + getCurrentUnit() + "</li>";
    document.getElementById("stat-data").innerHTML += "<li class=\"mb-3\"><h6>Gesamtverbrauch</h6>" +
        responseObj.sumKwh + " kWh</li>";
    document.getElementById("stat-data").innerHTML += "<li class=\"mb-3\"><h6>Gesamtkosten</h6>" +
        "<span id=\"stat-price\">" + formatNumber(responseObj.sumKwh * kwhPrice) + "</span> €</li>";
}

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

function priceChanged() {
    let currentPrice = document.getElementById("price-select").value / 100;
    document.getElementById("price-val").innerText = currentPrice.toFixed(2);
    document.getElementById("stat-price").innerText = formatNumber(responseObj.sumKwh * currentPrice);
    updateTable(currentPrice);
}

function updateUserInformation() {
    let userSelector = document.getElementById('user-selector');

    if (userSelector[0].value === "default") {
        userSelector[0].remove();
    }

    let http = new XMLHttpRequest();

    http.onreadystatechange = function () {
        parseMinMaxResponse.call(this);
    };

    http.open("GET", "http://localhost:5000/min-max?u=" + userSelector.value, true);
    http.send();
}

function meterReadingsSelectorChanged(checkbox) {
    if (checkbox.checked) {
        if (myChart.data.datasets.length === 1) {
            myChart.data.datasets.push({
                label: 'Zählerstand',
                data: responseObj.meterReadings,
                backgroundColor: "rgba(255, 0, 0, 0.2)",
                borderColor: "rgb(255, 0, 0)",
                borderWidth: 1,
                type: "line",
                yAxisID: 'y-axis-energy'
            });
            myChart.options.scales.yAxes[1].display = true;
        } else {
            myChart.data.datasets[1].data = responseObj.meterReadings;
        }
    } else if (myChart.data.datasets.length === 2) {
        myChart.data.datasets.pop();
        myChart.options.scales.yAxes[1].display = false;
    }
    myChart.update();
}

/** Parse response functions **/

function parseUserResponse() {
    let userInfo = document.getElementById("user-list-all");
    let userSelector = document.getElementById("user-selector");

    if (this.readyState === 4) {
        if (this.status === 200) {
            let response = JSON.parse(this.responseText);
            response['users'].forEach(u => userList.push(u));   // Store users in array
            userList.forEach(u =>
                userSelector.innerHTML += "<option value=\"" + u["number"] + "\">" + u["number"] +
                    "</option>");
            userList.forEach(u =>
                userInfo.innerHTML += "<li>" + u["number"] + " - " + u["firstname"] + " " + u["lastname"] + ", " + u["city"] + " (" + u["zipcode"] + ")"
            )
        } else if (this.status === 400) {
            window.alert(this.getResponseHeader(this.response));
        } else if (this.status === 500) {
            window.alert("Interner Server Fehler!");
        } else {
            window.alert("Server ist nicht verfügbar!");
        }
    }
}

function parseMinMaxResponse() {
    if (this.readyState === 4) {
        if (this.status === 200) {

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
        } else if (this.status === 500) {
            window.alert("Interner Server Fehler!");
        } else {
            window.alert("Server ist nicht verfügbar!");
        }
    }
}

function parseDataResponse() {
    if (this.readyState === 4) {
        if (this.status === 200) {
            storeResponseValues(JSON.parse(this.responseText));
            updatePage();
        } else if (this.status === 400) {
            window.alert(this.responseText);
        } else if (this.status === 500) {
            window.alert("Interner Server Fehler!");
        } else {
            window.alert("Server ist nicht verfügbar!");
        }
    }
}

/** ## Helper functions ## **/
function checkSelections() {
    let valueList = [];
    valueList.push(document.getElementById("user-selector").value);

    switch (state) {
        case 1:
            valueList.push(document.getElementById("date-selector").value);
            break;
        case 2:
            valueList.push(document.getElementById("first-date-selector").value);
            valueList.push(document.getElementById("last-date-selector"));
            break;
        case 3:
            valueList.push(document.getElementById("month-selector").value);
            break;
        case 4:
            valueList.push(document.getElementById("year-selector").value);
            break;
    }

    if (valueList.indexOf("") >= 0) {
        console.log("Fail");
        return false;
    } else {
        console.log("True");
        return true;
    }
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

function storeResponseValues(response) {
    responseObj.labels = response['times'];
    responseObj.loadDiffs = response['energy_diffs'];
    responseObj.meterReadings = response['meter_readings'];
    responseObj.avgKwh = response['avg'];
    responseObj.maxKwh = response['max'];
    responseObj.minKwh = response['min'];
    responseObj.sumKwh = response['sum'];
}

function getCurrentUnit() {
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

function formatNumber(number) {
    return Number.parseFloat(number).toFixed(2);
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
        let returnMonth = monthsList[month.getMonth()];
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
