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

function parseUserResponse() {
    /**
     * Parse the response of /users, add all available users in the database to the user list
     * and display these on the start page
     * **/

    if (this.readyState === 4) {    //  4 -> XMLHttpRequest status: DONE
        if (this.status === 200) {  // 200 -> HTTP response status: OK
            let response = JSON.parse(this.responseText);

            response['users'].forEach(u => userList.push(u));   // Store users in user list

            addUsersToUserSelector();
            addUsersToStartPage();

        } else if (this.status === 400) {   // 400 -> HTTP response status: Bad request
            window.alert(this.getResponseHeader(this.response));
        } else {
            window.alert("Server Fehler!");
        }
    }
}

function addUsersToUserSelector() {
    userList.forEach(u => document.getElementById("user-selector").innerHTML +=
            "<option value=\"" + u["number"] + "\">" + u["number"] + "</option>");
}

function addUsersToStartPage() {
    userList.forEach(u => document.getElementById("user-list-all").innerHTML +=
        "<li>" + u["number"] + " - " + u["firstname"] + " " + u["lastname"] + ", " + u["city"] + " (" + u["zipcode"] + ")</li>");
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

function parseDataResponse() {
    /**
     * Parse the response of /data and update the complete page
     * **/

    if (this.readyState === 4) {    // 4 -> XMLHttpRequest status: DONE
        if (this.status === 200) {  // 200 -> HTTP response status: OK
            storeResponseValues(JSON.parse(this.responseText));
            updatePage();
        } else if (this.status === 400) {   // 400 -> HTTP response status: Bad request
            window.alert(this.responseText);
        } else {
            window.alert("Server Fehler!");
        }
    }
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
    } else {
        return;
    }

    checkCurrentNavDate(datetimeSelector);
}

function checkCurrentNavDate(selector) {
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
    /**
     * Update the table according to the current response data
     * **/

    document.getElementById("data-table").innerHTML = buildTable(kwhPrice);
    updateDatetimeTableTitle();
}

function buildTable(kwhPrice) {
    let tableContent = "";

    // Add table tag
    tableContent += "<table class=\"table table-striped table-sm table-hover text-center\">";

    // Add table header
    tableContent += "<tr class=\"d-flex\"><th id=\"datetime-title\" class=\"col\"></th><th class=\"col\">"
        + "Lastgang [" + getCurrentUnit() + "]</th>" + "<th class=\"col\">Zählerstand [kWh] </th>"
        + "<th class=\"col\">Kosten [€]</th></tr>";

    // Add table values
    for (let index in responseObj.labels) {
        tableContent += "<tr class=\"d-flex\"><td class=\"col\">" + formatLabel(responseObj.labels[index])
            + "</td><td class=\"col\">" + formatNumber(responseObj.loadDiffs[index]) + "</td><td class=\"col\">"
            + formatNumber(responseObj.meterReadings[index]) + "</td><td class=\"col\">"
            + calculatePrice(responseObj.loadDiffs[index], kwhPrice) + " €</td></tr>";
    }

    // Close table tag
    tableContent += "</table>";

    return tableContent;
}

function updateDatetimeTableTitle() {
    let title = document.getElementById('datetime-title');

    switch (state) {
        case 1: // state = day
            title.innerText = "Uhrzeit";
            break;
        case 2: // state = interval
        case 3: // state = month
            title.innerText = "Datum";
            break;
        case 4: // state = year
            title.innerText = "Monat"
    }
}

function updateStatistics(kwhPrice) {
    /**
     * Update the statistics data according to the current response data
     * **/

    document.getElementById("stat").style.display = "block";

    document.getElementById("stat-data").innerHTML =
        "<li class=\"mb-3\"><h6>Durchschnittsverbrauch</h6>" + responseObj.avgKwh + " " + getCurrentUnit() + "</li>"
        + "<li class=\"mb-3\"><h6>Maximalverbrauch</h6>" + responseObj.maxKwh + " " + getCurrentUnit() + "</li>"
        + "<li class=\"mb-3\"><h6>Minimalverbrauch</h6>" + responseObj.minKwh + " " + getCurrentUnit() + "</li>"
        + "<li class=\"mb-3\"><h6>Gesamtverbrauch</h6>" + responseObj.sumKwh + " kWh</li>"
        + "<li class=\"mb-3\"><h6>Gesamtkosten</h6>" + "<span id=\"stat-price\">"
        + formatNumber(responseObj.sumKwh * kwhPrice) + "</span> €</li>";
}

function modeChanged() {
    /**
     * Change UI and state according to the user selection
     * **/

    const modeSelector = document.getElementById('mode-selector');

    if (modeSelector.value === "day") {
        setStateToDay();
    } else if (modeSelector.value === "interval") {
        setStateToInterval();
    } else if (modeSelector.value === "month") {
        setStateToMonth();
    } else {
        setStateToYear();
    }
}

function setStateToDay() {
    document.getElementById("day-options").style.display = "block";
    document.getElementById("interval-options").style.display = "none";
    document.getElementById("month-options").style.display = "none";
    document.getElementById("year-options").style.display = "none";
    state = 1; // Set state to day
}

function setStateToInterval() {
    document.getElementById("day-options").style.display = "none";
    document.getElementById("interval-options").style.display = "block";
    document.getElementById("month-options").style.display = "none";
    document.getElementById("year-options").style.display = "none";
    state = 2; // Set state to custom
}

function setStateToMonth() {
    document.getElementById("day-options").style.display = "none";
    document.getElementById("interval-options").style.display = "none";
    document.getElementById("month-options").style.display = "block";
    document.getElementById("year-options").style.display = "none";
    state = 3; // Set state to month
}

function setStateToYear() {
    document.getElementById("day-options").style.display = "none";
    document.getElementById("interval-options").style.display = "none";
    document.getElementById("month-options").style.display = "none";
    document.getElementById("year-options").style.display = "block";
    state = 4; // Set state to year
}

function priceChanged() {
    /**
     * Change kWh price according to the user selection
     * **/

    let currentPrice = document.getElementById("price-select").value / 100;
    document.getElementById("price-val").innerText = currentPrice.toFixed(2);
    document.getElementById("stat-price").innerText = formatNumber(responseObj.sumKwh * currentPrice);
    updateTable(currentPrice);
}

function meterReadingsSelectorChanged(checkbox) {
    /**
     * Add and remove the meter value line graph from the chart
     * **/

    if (checkbox.checked) { // Add line graph
        if (myChart.data.datasets.length === 1) {   // Add line graph if not already in chart
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
            myChart.data.datasets[1].data = responseObj.meterReadings;  // Update line graph values if already in chart
        }
    } else if (myChart.data.datasets.length === 2) {    // Remove line graph if already in chart
        myChart.data.datasets.pop();
        myChart.options.scales.yAxes[1].display = false;
    }

    myChart.update();
}

function getMinMaxInformation() {
    /**
     * Get the min/max values of the currently selected meter
     * **/

    let userSelector = document.getElementById('user-selector');

    // Remove user selector placeholder
    if (userSelector[0].value === "") {
        userSelector[0].remove();
    }

    let http = new XMLHttpRequest();

    http.onreadystatechange = function () {
        parseMinMaxResponse.call(this);
    };

    http.open("GET", "http://localhost:5000/min-max?u=" + userSelector.value, true);
    http.send();
}

function parseMinMaxResponse() {
    /**
     * Parse the response of /min-max and update the min/max values of the date inputs accordingly
     * **/

    if (this.readyState === 4) {    // 4 -> XMLHttpRequest status: DONE
        if (this.status === 200) {  // 200 -> HTTP response status: OK
            let response = JSON.parse(this.responseText);
            let maxDate = response['max_date'];
            let minDate = response['min_date'];

            setDateSelectorRange(minDate, maxDate);
            setIntervalSelectorRange(minDate, maxDate);
            setMonthSelectorRange(minDate, maxDate);
            setYearSelectorRange(minDate);  // TODO: Implement function
        } else {
            window.alert("Server Fehler");
        }
    }
}

function setDateSelectorRange(min, max) {
    document.getElementById('date-selector').min = min;
    document.getElementById('date-selector').max = max;
}

function setIntervalSelectorRange(min, max) {
    document.getElementById('first-date-selector').min = min;
    document.getElementById('first-date-selector').max = max;
    document.getElementById('last-date-selector').min = min;
    document.getElementById('last-date-selector').max = max;
}

function setMonthSelectorRange(min, max) {
    document.getElementById('month-selector').min = min.match(/(\d+-\d+)(?=-)/g);
    document.getElementById('month-selector').max = max.match(/(\d+-\d+)(?=-)/g);
}

function setYearSelectorRange(min) {
    document.getElementById('year-selector').innerHTML =
        "<option value=\"" + min.match(/(\d\d\d\d)(?=-)/g) + "\">" + min.match(/(\d\d\d\d)(?=-)/g)
        + "</option>";
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

    return valueList.indexOf("") < 0;
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

// TODO: Convert to Moment.JS, fix reverse nav button skipping one month
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
