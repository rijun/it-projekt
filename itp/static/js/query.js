document.getElementById("queryForm").addEventListener( "submit", ev => {
    // Prevent form element from submitting
    ev.preventDefault();
    sendData();
});

function sendData() {
    // Bind the FormData object and the form element
    const formData = new FormData(document.getElementById("queryForm"));

    let selectedMode;

    for (let navLink of document.getElementsByClassName('nav-link')) {
        if (navLink.classList.contains('active')) {
            const navLinkName = navLink.id;
            selectedMode = navLinkName.substring(0, navLinkName.length - 3);    // Remove Tag from id
        }
    }

    if (checkInput(selectedMode) === false) { return; }

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
