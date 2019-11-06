// Setup event handlers
document.getElementById("sendButton").onclick = () => { console.log("Button") };

function setupMeterSelector() {
    let meterSelector = document.getElementById('meterSelector');
    JSON.parse(sessionStorage.meters).forEach(meter => {
        let opt = document.createElement('option');
        opt.value = meter;
        opt.innerHTML = meter;
        meterSelector.add(opt);
    })
}

function setMeterButtonEvents() {
    const meterButtonList = document.getElementsByClassName('meter')
    for (let meterButton of meterButtonList) {
        // Cannot use arrow function as "this" represents the function owner, not the function caller
        meterButton.onclick = function() {
            document.getElementById('showModalButton').click();
            document.getElementById('meterSelector').value = this.id;
        }
    }
}

// Run on startup
window.onload = function () {
    moment.locale('de');    // Set Moment.js to german language
    addMetersToStorage();
    setupMeterSelector();
    setMeterButtonEvents();
};

