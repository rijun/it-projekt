function initQueryModal() {
    // Prevent form element from submitting
    document.getElementById("queryForm").addEventListener("submit", ev => {
        ev.preventDefault();
        sendData();
    });
    populateMeterSelector();
    checkNativeMonthSelector();
}

function populateMeterSelector() {
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
    // Delete all children from fallback year selector
    const fallbackYearSelector = document.getElementById('yearSelectorFallback');
    while (fallbackYearSelector.firstChild) {
        fallbackYearSelector.removeChild(fallbackYearSelector.firstChild);
    }
    for (let year = minDate.year(); year <= maxDate.year(); year++) {
        const option = document.createElement('option');
        option.textContent = year;
        option.value = year;
        fallbackYearSelector.appendChild(option);
    }
    document.getElementById('monthSelector').disabled = false;
    document.getElementById('monthSelectorFallback').disabled = false;
    document.getElementById('yearSelectorFallback').disabled = false;
    /* Year selector */
    const yearSelector = document.getElementById('yearSelector');
    // Delete all children from year selector
    while (yearSelector.firstChild) {
        yearSelector.removeChild(yearSelector.firstChild);
    }
    const startYear = moment(meterDates.min);
    const endYear = moment(meterDates.max);
    while (endYear.diff(startYear, 'years') >= 0) {
        const option = document.createElement('option');
        const yearStr =  startYear.format("YYYY");
        option.textContent = yearStr;
        option.value = yearStr;
        yearSelector.appendChild(option);
        if (endYear.diff(startYear, 'years') === 0) {
            break;
        } else {
             startYear.add(1, 'year');
        }
    }
    document.getElementById('yearSelector').disabled = false;
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
        const month = document.getElementById('monthSelectorFallback').value;
        const year = document.getElementById('yearSelectorFallback').value;
        document.getElementById('monthSelector').value = `${year}-${month}`;
    }

    console.log("Checking input...");
    if (checkInput(selectedMode) === false) {
        console.log("Check failed...");
        return;
    }
    console.log("Check successful!");
    console.log("Building URL...");
    // Bind the FormData object and the form element
    const formData = new FormData(document.getElementById("queryForm"));

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

function checkInput(mode) {
    let checkResult = true;     // Be optimistic
    switch (mode) {
        case 'day':
            if (document.getElementById('dateSelector').value === "") {
                checkResult = false;
                document.getElementById('invalidDate').style.display = 'block';
            } else {
                document.getElementById('invalidDate').style.display = 'none';
            }
            break;
        case 'interval':
            if (document.getElementById('firstDateSelector').value === "") {
                checkResult = false;
                document.getElementById('invalidStartDate').style.display = 'block';
            } else {
                document.getElementById('invalidStartDate').style.display = 'none';
            }
            if (document.getElementById('lastDateSelector').value === "") {
                checkResult = false;
                document.getElementById('invalidLastDate').style.display = 'block';
            } else {
                document.getElementById('invalidLastDate').style.display = 'none';
            }
            break;
        case 'month':
            if (document.getElementById('monthSelector').value === "") {
                checkResult = false;
                document.getElementById('invalidMonth').style.display = 'block';
            } else {
                document.getElementById('invalidMonth').style.display = 'none';
            }
            break;
        case 'year':
            if (document.getElementById('yearSelector').value === "") {
                checkResult = false;
                document.getElementById('invalidYear').style.display = 'block';
            } else {
                document.getElementById('invalidYear').style.display = 'none';
            }
            break;
    }
    return checkResult;
}
