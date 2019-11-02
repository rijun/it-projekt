// Setup event handlers
document.getElementById("sendButton").onclick = () => {
    e.preventDefault();
    console.log("Button")
}

// Run on startup
window.onload = function () {
    moment.locale('de');    // Set Moment.js to german language
};
