let myChart;
let state = 1; // 1 - day, 2 - custom, 3 - month, 4 - year
let userList = [];

window.onload = function () {
    // Chart initialization
    setupChart();
    // Get available users
    loadUsers();
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
                        labelString: 'Zeitpunkt'
                    }
                }],
                yAxes: [{
                    type: 'linear', // only linear but allow scale type registration. This allows extensions to exist solely for log scale for instance
                    display: true,
                    position: 'left',
                    id: 'y-axis-load',
                    scaleLabel: {
                        display: true,
                        labelString: 'Last / kWh/h'
                    }
                }, {
                    type: 'linear', // only linear but allow scale type registration. This allows extensions to exist solely for log scale for instance
                    display: true,
                    position: 'right',
                    id: 'y-axis-energy',
                    scaleLabel: {
                        display: true,
                        labelString: 'Zählerstand / kWh'
                    },
                    gridLines: {
                        drawOnChartArea: false, // only want the grid lines for one axis to show up
                    }
                }]
            }
        }
    });
}

// Request data from server and process it
function requestData() {
    document.getElementById("placeholder").style.display = "none";
    document.getElementById("content").style.display = "block";

    var http = new XMLHttpRequest();

    http.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {   // Response OK
            updatePage(JSON.parse(this.responseText));
        } else if (this.readyState == 4 && this.status == 400) {    // Response failed
            window.alert("Fehler!");
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
    let labels = response['dates'];
    let loadDiffs = response['diff'];
    let meterReadings = response['energy'];
    let avgKwh = response['avg'];
    let maxKwh = response['max'];
    let minKwh = response['min'];
    let sumKwh = response['sum'];
    // Get current kWh price
    let kwhPrice = document.getElementById("money-select").value / 100;
    // Update page contents
    updateHeader();
    updateChart(labels, loadDiffs, meterReadings);
    updateTable(labels, loadDiffs, meterReadings, kwhPrice);
    updateStatistics(avgKwh, maxKwh, minKwh, sumKwh, kwhPrice);

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
        document.getElementById("prev-day").style.display = "inline";
        document.getElementById("next-day").style.display = "inline";
        state = 1; // Set state to day
    } else if (modeSelector.value === "interval") {
        document.getElementById("day-options").style.display = "none";
        document.getElementById("interval-options").style.display = "block";
        document.getElementById("month-options").style.display = "none";
        document.getElementById("year-options").style.display = "none";
        document.getElementById("prev-day").style.display = "none";
        document.getElementById("next-day").style.display = "none";
        state = 2; // Set state to custom
    } else if (modeSelector.value === "month") {
        document.getElementById("day-options").style.display = "none";
        document.getElementById("interval-options").style.display = "none";
        document.getElementById("month-options").style.display = "block";
        document.getElementById("year-options").style.display = "none";
        document.getElementById("prev-day").style.display = "none";
        document.getElementById("next-day").style.display = "none";
        state = 3; // Set state to month
    } else {
        document.getElementById("day-options").style.display = "none";
        document.getElementById("interval-options").style.display = "none";
        document.getElementById("month-options").style.display = "none";
        document.getElementById("year-options").style.display = "block";
        document.getElementById("prev-day").style.display = "none";
        document.getElementById("next-day").style.display = "none";
        state = 4; // Set state to year
    }
}

function formatNumber(number) {
    return Number.parseFloat(number).toFixed(2);
}

function priceChanged() {
    let price = document.getElementById("money-select").value / 100;
    document.getElementById("money-val").innerText = price.toFixed(2);
    console.log(price);
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

function loadUsers() {
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

function updateUser() {
    let http = new XMLHttpRequest();
    http.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
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

    http.open("GET", "http://localhost:5000/users?u=" + document.getElementById("user-selector").value, true);
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

/** Update functions **/
function updateHeader() {
    // Array for storing month names
    let months = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
    // Array for storing weekday names
    let weekdays = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

    switch (state) {
        case 1:
            let date = new Date(document.getElementById("date-selector").value);
            document.getElementById("title").innerText = "Lastgang vom " + String(date.getDate()).padStart(2, '0') + ". " + months[
                    date.getMonth()] +
                " " + date.getFullYear();
            break;
        case 2:
            let firstDate = new Date(document.getElementById("first-date-selector").value);
            let lastDate = new Date(document.getElementById("last-date-selector").value);
            document.getElementById("title").innerText = "Lastgang vom " + String(firstDate.getDate()).padStart(2, '0') + ". " +
                months[
                    firstDate.getMonth()] + " " + firstDate.getFullYear() + " - " + String(lastDate.getDate()).padStart(2, '0') +
                ". " +
                months[lastDate.getMonth()] + " " + lastDate.getFullYear();
            break;
        case 3:
            let month = new Date(document.getElementById("month-selector").value);
            document.getElementById("title").innerText = "Lastgang vom " + months[month.getMonth()] + " " +
                month.getFullYear();
            break;
        case 4:
            let year = new Date(document.getElementById("year-selector").value);
            document.getElementById("title").innerText = "Lastgang vom Jahr " + year.getFullYear();
            break;
    }
}

function updateChart(labels, loads, energy) {
     myChart.data.labels = labels;
    myChart.data.datasets[0].data = loads;
    if (document.getElementById("energy-view").checked === true) {
        if (myChart.data.datasets.length === 1) {
            myChart.data.datasets.push({
                label: 'Zählerstand',
                data: energy,
                backgroundColor: "rgba(0, 0, 255, 0.2)",
                borderColor: "rgb(0, 0, 255)",
                borderWidth: 1,
                type: "line",
                yAxisID: 'y-axis-energy',
            })
        } else {
            myChart.data.datasets[1].data = energy;
        }
    } else if (myChart.data.datasets.length === 2) {
        myChart.data.datasets.pop();
    }
    myChart.update();
}

function updateTable(labels, loadDiffs, meterReadings, kwhPrice) {
    let tableData = "<table class=\"table table-striped table-sm\"><tr><th>Zeitpunkt</th><th>Lastgang / kW </th><th>Zählerstand / kWh </th><th>Kosten / € </th></tr>";
    for (let index in labels) {
        tableData += "<tr><td>" + labels[index] + "</td><td>" +
            formatNumber(loadDiffs[index]) + "</td><td>" +
            formatNumber(meterReadings[index]) + "</td><td>" +
            calculatePrice(loadDiffs[index], kwhPrice) + "</td></tr>";
    }
    tableData += "</table>";
    document.getElementById("data-table").innerHTML = tableData;
}

function updateStatistics(average, maximum, minimum, sum, price) {
    document.getElementById("stat").style.display = "block";
    document.getElementById("stat-data").innerHTML = "<li class=\"mb-3\"><h6>Durchschnittsverbrauch</h6>" +
        average + " kWh</li>";
    document.getElementById("stat-data").innerHTML += "<li class=\"mb-3\"><h6>Maximalverbrauch</h6>" +
        maximum + " kWh</li>";
    document.getElementById("stat-data").innerHTML += "<li class=\"mb-3\"><h6>Minimalverbrauch</h6>" +
        minimum + " kWh</li>";
    document.getElementById("stat-data").innerHTML += "<li class=\"mb-3\"><h6>Gesamtverbrauch</h6>" +
        sum + " kWh</li>";
    document.getElementById("stat-data").innerHTML += "<li class=\"mb-3\"><h6>Gesamtkosten</h6>" +
        formatNumber(sum * price) + " €</li>";
}