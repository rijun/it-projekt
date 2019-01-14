let myChart;
let state = 1;          // 1 - day, 2 - interval, 3 - month, 4 - year
let userList = [];      // List for storing all available users
let responseObj = {};   // Object for storing the response values

window.onload = function () {
    moment.locale('de');    // Set Moment.js to german language
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

    let inputsValid = checkInputs();

    if (!inputsValid) {   // Check if user has selected something
        alert("Eingabe fehlerhaft!");
        return;
    }

    // Hide welcome screen
    document.getElementById("startup").style.display = "none";
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
    createDatetimeList(response['times']);
    // responseObj.labels = response['times'];
    responseObj.loadDiffs = response['energy_diffs'];
    responseObj.meterReadings = response['meter_readings'];
    responseObj.avgKwh = response['avg'];
    responseObj.maxKwh = response['max'];
    responseObj.minKwh = response['min'];
    responseObj.sumKwh = response['sum'];
}

function createDatetimeList(responseList) {
    responseObj.datetimes = [];
    let datetimeFormat = "";

    if (state === 1) {  // state = day
        datetimeFormat = "YYYY-MM-DD HH:mm";
    } else {
        datetimeFormat = "YYYY-MM-DD";
    }

    responseList.forEach(t => responseObj.datetimes.push(moment(t, datetimeFormat)));
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
            let date = moment(document.getElementById("date-selector").value);
            buildDateHeader(date);
            break;
        case 2: // state = interval
            let firstDate = moment(document.getElementById("first-date-selector").value);
            let lastDate = moment(document.getElementById("last-date-selector").value);
            buildIntervalHeader(firstDate, lastDate);
            break;
        case 3: // state = month
            let month = moment(document.getElementById("month-selector").value);
            console.log(month);
            buildMonthHeader(month);
            break;
        case 4: // state = year
            let year = moment(document.getElementById("year-selector").value);
            console.log(year);
            buildYearHeader(year);
            break;
    }

    checkNavArrows();  // Disable prev/next arrows if the current date is the last available date
    buildUserInfoHeader();
}

function buildDateHeader(date) {
    document.getElementById("title").innerText =
        date.format("dddd, Do MMMM YYYY");
    showDayNavArrows();
}

function buildIntervalHeader(firstDate, lastDate) {
    document.getElementById("title").innerText =
        firstDate.format("LL") + " - " + lastDate.format("LL");
    hideNavArrows();
}

function buildMonthHeader(month) {
    document.getElementById("title").innerText = month.format("[Lastgang vom] MMMM YYYY");
    showMonthNavArrows();
}

function buildYearHeader(year) {
    document.getElementById("title").innerText = year.format("[Lastgang vom Jahr] YYYY");
    hideNavArrows();
}

function checkNavArrows() {
    let datetimeSelector;

    if (state === 1) {  // state = day
        datetimeSelector = document.getElementById('date-selector');
    } else if (state === 3) {   // state = month
        datetimeSelector = document.getElementById('month-selector');
    } else {
        return;
    }

    checkNavArrowsRange(datetimeSelector);
}

function checkNavArrowsRange(selector) {
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

function buildUserInfoHeader() {
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
    let formattedLabels = [];

    switch (state) {
        case 1: // state = day
            responseObj.datetimes.forEach(t => formattedLabels.push(t.format("LT")));
            break;
        case 2: // state = interval
        case 3: // state = month
            responseObj.datetimes.forEach(t => formattedLabels.push(t.format("L")));
            break;
        case 4: // state = year
            responseObj.datetimes.forEach(t => formattedLabels.push(t.format("MMMM")));
    }

    myChart.data.labels = formattedLabels;
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
    updateTableTitle();
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
    for (let index in responseObj.datetimes) {
        tableContent += "<tr class=\"d-flex\"><td class=\"col\">" + formatLabel(responseObj.datetimes[index])
            + "</td><td class=\"col\">" + roundTwoPlaces(responseObj.loadDiffs[index]) + "</td><td class=\"col\">"
            + roundTwoPlaces(responseObj.meterReadings[index]) + "</td><td class=\"col\">"
            + calculatePrice(responseObj.loadDiffs[index], kwhPrice) + " €</td></tr>";
    }

    // Close table tag
    tableContent += "</table>";

    return tableContent;
}

function updateTableTitle() {
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

    document.getElementById("stat").style.display = "block";    // Show statistics

    document.getElementById("stat-data").innerHTML =
        "<li class=\"mb-3\"><h6>Durchschnittsverbrauch</h6>" + responseObj.avgKwh + " " + getCurrentUnit() + "</li>"
        + "<li class=\"mb-3\"><h6>Maximalverbrauch</h6>" + responseObj.maxKwh + " " + getCurrentUnit() + "</li>"
        + "<li class=\"mb-3\"><h6>Minimalverbrauch</h6>" + responseObj.minKwh + " " + getCurrentUnit() + "</li>"
        + "<li class=\"mb-3\"><h6>Gesamtverbrauch</h6>" + responseObj.sumKwh + " kWh</li>"
        + "<li class=\"mb-3\"><h6>Gesamtkosten</h6>" + "<span id=\"stat-price\">"
        + roundTwoPlaces(responseObj.sumKwh * kwhPrice) + "</span> €</li>";
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
    document.getElementById("stat-price").innerText = roundTwoPlaces(responseObj.sumKwh * currentPrice);
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
            setYearSelectorRange(minDate);
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
    document.getElementById('month-selector').min = moment(min).format("YYYY-MM");
    document.getElementById('month-selector').max = moment(max).subtract(1, "months").format("YYYY-MM");
}

function setYearSelectorRange(min) {
    document.getElementById('year-selector').innerHTML =
        "<option value=\"" + moment(min).format("YYYY") + "\">" + moment(min).format("YYYY") + "</option>";
}

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

function calculatePrice(load, price) {
    /**
     * Calculate the cost of the energy used
     * **/

    let cost;

    switch (state) {
        case 1: // state = day
            cost = load * price / 60 * document.getElementById("resolution-selector").value;
            break;
        case 2: // state = interval
            cost = load * price / 24;
            break;
        case 3: // state = month
            cost = load * price / 24;
            break;
        case 4: // state = year
            cost = load * price / 60 * document.getElementById("resolution-selector").value;
            break;
    }
    return cost.toFixed(3)
}

function createArguments() {
    /**
     * Combine the selection values and parameter names to form the correct request arguments
     * **/

    let arguments = "u=" + document.getElementById("user-selector").value;

    switch (state) {
        case 1: // state = day
            arguments += "&mode=" + document.getElementById("mode-selector").value +
                "&d=" + document.getElementById("date-selector").value +
                "&r=" + document.getElementById("resolution-selector").value;
            break;
        case 2: // state = interval
            arguments += "&mode=" + document.getElementById("mode-selector").value +
                "&sd=" + document.getElementById("first-date-selector").value +
                "&ed=" + document.getElementById("last-date-selector").value;
            break;
        case 3: // state = month
            arguments += "&mode=" + document.getElementById("mode-selector").value +
                "&m=" + document.getElementById("month-selector").value;
            break;
        case 4: // state = year
            arguments += "&mode=" + document.getElementById("mode-selector").value +
                "&y=" + document.getElementById("year-selector").value;
            break;
    }
    return arguments;
}

function getCurrentUnit() {
    /**
     * Returns the current unit according to the currently selected state
     * **/

    let unit = "";
    switch (state) {
        case 1: // state = day
            if (document.getElementById("resolution-selector").value === "15") {
                unit = "kWh / Viertelstunde";
            } else {
                unit = "kWh / Stunde";
            }
            break;
        case 2: // state = interval
            unit = "kWh / Tag";
            break;
        case 3: // state = month
            unit = "kWh / Tag";
            break;
        case 4: // state = year
            unit = "kWh / Monat";
            break;
    }
    return unit;
}

function roundTwoPlaces(number) {
    return Number.parseFloat(number).toFixed(2);
}

function formatLabel(date_time) {

    switch (state) {
        case 1: // state = day
            return date_time.format("HH:mm");
        case 2: // state = interval
        case 3: // state = month
            return date_time.format("L");
        case 4: // state = year
            return date_time.format("MMMM");
    }
}

function increaseDate() {
    let daySelector = document.getElementById('date-selector');
    let date = moment(daySelector.value);
    daySelector.value = date.add(1, "days").format("YYYY-MM-DD");
    requestData();
}

function decreaseDate() {
    let daySelector = document.getElementById('date-selector');
    let date = moment(daySelector.value);
    daySelector.value = date.subtract(1, "days").format("YYYY-MM-DD");
    requestData();
}

function increaseMonth() {
    let monthSelector = document.getElementById('month-selector');
    let month = new moment(monthSelector.value);
    monthSelector.value = month.add(1, "months").format("YYYY-MM");
    requestData();
}

function decreaseMonth() {
    let monthSelector = document.getElementById('month-selector');
    let month = new moment(monthSelector.value);
    monthSelector.value = month.subtract(1, "months").format("YYYY-MM");
    requestData();
}
