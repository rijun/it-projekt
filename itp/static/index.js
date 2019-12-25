// TODO Restructure JS files, add https://github.com/julien-maurel/js-storage
function setMeterButtonEvents() {
    const meterButtonList = document.getElementsByClassName('meter');
    for (let meterButton of meterButtonList) {
        // Cannot use arrow function as "this" represents the function owner, not the function caller
        meterButton.onclick = function () {
            document.getElementById('meterSelector').value = this.id;
            setSelectorRanges();    // Manual invocation as changing the value doesn't trigger the onchange event
        }
    }
}

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
    window.meters = meters; // Store available meters in a global object
}

function initSelection(availableMeters) {
    setMeterButtonEvents();
    addMetersToStorage(availableMeters);
}