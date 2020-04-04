function addMetersToStorage(meterList) {
    let meters = {};
    meterList.forEach(meter => {
        meters[meter.id] = {
            'id': meter.id,
            'date': {
                'min': meter.min,
                'max': meter.max
            }
        };
    });
    store.set('meters', meters); // Store available meters
}

function setMeterSelectionButtonEvents() {
    const meterButtonList = document.getElementsByClassName('meter');
    for (let meterButton of meterButtonList) {
        // Cannot use arrow function as "this" represents the function owner, not the function caller
        meterButton.onclick = function () {
            document.getElementById('meterSelector').value = this.id;
            setSelectorRanges(true);    // Manual invocation as changing the value doesn't trigger the onchange event
        }
    }
}

function initSelection(availableMeters) {
    addMetersToStorage(availableMeters);
    setMeterSelectionButtonEvents();
}

