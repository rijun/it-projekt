function initQueryModal() {
    // Prevent form element from submitting
    document.getElementById("queryForm").addEventListener("submit", ev => {
        ev.preventDefault();
        sendData();
    });
    document.getElementById('meterSelector').onchange = setSelectorRanges;
    populateMeterSelector();
    checkNativeMonthSelector();
}

function populateMeterSelector() {
    // Add available meters to meter selector
    for (let meter in store.get('meters')) {
        let opt = document.createElement('option');
        opt.value = meter;
        opt.innerHTML = meter;
        document.getElementById('meterSelector').add(opt);
    }
}

function setSelectorRanges(index = false) {
    const selectorOption = document.getElementById('meterSelector').value;
    const meterDates = store.get('meters')[selectorOption].date;
    // Date selector
    document.getElementById('dateSelector').min = moment(meterDates.min).format("YYYY-MM-DD");
    document.getElementById('dateSelector').max = moment(meterDates.max).format("YYYY-MM-DD");
    document.getElementById('dateSelector').disabled = false;
    // Interval selector
    document.getElementById('firstDateSelector').min = meterDates.min;
    document.getElementById('firstDateSelector').max = meterDates.max;
    document.getElementById('firstDateSelector').disabled = false;
    document.getElementById('lastDateSelector').min = meterDates.min;
    document.getElementById('lastDateSelector').max = meterDates.max;
    document.getElementById('lastDateSelector').disabled = false;
    /* Month selector */
    const minDate = moment(meterDates.min);
    const maxDate = moment(meterDates.max).subtract(1, 'months');
    document.getElementById('monthSelector').min = minDate.format("YYYY-MM");
    document.getElementById('monthSelector').max = maxDate.format("YYYY-MM");
    setupFallbackMonthSelector(minDate, maxDate);
    document.getElementById('monthSelector').disabled = false;
    document.getElementById('monthSelectorFallback').disabled = false;
    /* Year selector */
    setupYearSelector(minDate, maxDate);
    document.getElementById('yearSelector').disabled = false;

    // Set the default selector values
    if (index) {
        setDefaultSelectorValues(maxDate);
    } else {
        setDefaultSelectorValues()
    }
}

function setupYearSelector(minDate, maxDate) {
    const yearSelector = document.getElementById('yearSelector');
    // Reset contents of year selector
    yearSelector.innerHTML = "";

    // Add available years to selector
    let yearList = [];
    let y = moment(minDate);
    do {
        const yearStr = y.format('YYYY');
        if (yearList.indexOf(yearStr) === -1) { // Year not added yet to selector
            const option = document.createElement('option');
            option.textContent = yearStr;
            option.value = yearStr;
            yearSelector.appendChild(option);
            yearList.push(yearStr);
        }
        y.add(1, 'month');
    } while (!y.isAfter(maxDate, 'months'))
}

function setupFallbackMonthSelector(minDate, maxDate) {
    const fallbackMonthSelector = document.getElementById('monthSelectorFallback');
    // Reset contents of fallback month selector
    fallbackMonthSelector.innerHTML = "";

    // Add available months and years to fallback selector
    let m = moment(minDate);
    do {
        const option = document.createElement('option');
        option.textContent = m.format('MMMM YYYY');
        option.value = m.format('YYYY-MM');
        option.classList.add('month-option');
        fallbackMonthSelector.appendChild(option);
        m.add(1, 'month');
    } while (!m.isAfter(maxDate, 'month'))
}

function setDefaultSelectorValues(d = null) {
    if (d === null) {
        let re = window.params.match(/\d{4}-\d{2}-\d{2}/g);
        if (window.params.indexOf('s=') !== -1) {
            d = moment(re[1]);  // Use second element in regex result if mode is set to interval
        } else {
            d = moment(re[0]);
        }
    }

    document.getElementById('dateSelector').value = d.format("YYYY-MM-DD");
    document.getElementById('firstDateSelector').value = d.subtract(1, 'days').format("YYYY-MM-DD");
    document.getElementById('lastDateSelector').value = d.format("YYYY-MM-DD");
    document.getElementById('monthSelector').value = d.format("YYYY-MM");
    document.getElementById('monthSelectorFallback').value = d.format("YYYY-MM");
    document.getElementById('yearSelector').value = d.format("YYYY");
}

function checkNativeMonthSelector() {
    // Test whether a new date input falls back to a text input or not
    let test = document.createElement('input');

    try {
        test.type = 'month';
    } catch (e) {
        console.log(e.description);
    }

    // Substitute month selector for two selectors
    if (test.type === 'text') {
        // Hide the native picker and show the fallback
        document.getElementById('monthNative').classList.add('d-none');
        document.getElementById('monthFallback').classList.remove('d-none');
    }
}

function sendData() {
    let selectedMode;

    for (let navLink of document.getElementsByClassName('nav-link')) {
        if (navLink.classList.contains('active')) {
            const navLinkName = navLink.id;
            selectedMode = navLinkName.substring(0, navLinkName.length - 3);    // Remove Tag from id
        }
    }

    // Set month selector value to selected values
    const usingFallback = document.getElementById('monthNative').classList.contains('d-none');
    if (selectedMode === 'month' && usingFallback) {
        const monthYear = document.getElementById('monthSelectorFallback').value;
        document.getElementById('monthSelector').value = `${monthYear}`;
    }

    // Bind the FormData object and the form element
    const formData = new FormData(document.getElementById("queryForm"));
    console.log("Checking input...");
    if (checkInput(selectedMode, formData) === false) {
        console.log("Check failed...");
        return;
    }
    console.log("Check successful!");
    console.log("Building URL...");

    let url = `/dashboard/${selectedMode}/${formData.get('id')}?`;

    switch (selectedMode) {
        case 'day':
            url += `d=${formData.get('d')}`;
            break;
        case 'interval':
            url += `s=${formData.get('s')}&e=${formData.get('e')}`;
            break;
        case 'month':
            url += `m=${formData.get('m')}`;
            break;
        case 'year':
            url += `y=${formData.get('y')}`;
            break;
    }

    window.location = url;
}

function checkInput(mode, formData) {
    let checkResult = true;  // Be optimistic
    switch (mode) {
        case 'day':
            if (formData.get('d') === "") {
                checkResult = false;
                document.getElementById('invalidDate').style.display = 'block';
            } else {
                document.getElementById('invalidDate').style.display = 'none';
            }
            break;
        case 'interval':
            if (formData.get('s') === "") {
                checkResult = false;
                document.getElementById('invalidStartDate').style.display = 'block';
            } else {
                document.getElementById('invalidStartDate').style.display = 'none';
            }
            if (formData.get('e') === "") {
                checkResult = false;
                document.getElementById('invalidLastDate').style.display = 'block';
            } else {
                document.getElementById('invalidLastDate').style.display = 'none';
            }
            break;
        case 'month':
            const monthSelector = document.getElementById('monthSelector');
            const month = formData.get('m');
            if (month === "" || month < monthSelector.min || month > monthSelector.max) {
                checkResult = false;
                document.getElementById('invalidMonth').style.display = 'block';
            } else {
                document.getElementById('invalidMonth').style.display = 'none';
            }
            break;
        case 'year':
            if (formData.get('y') === "") {
                checkResult = false;
                document.getElementById('invalidYear').style.display = 'block';
            } else {
                document.getElementById('invalidYear').style.display = 'none';
            }
            break;
    }
    return checkResult;
}
