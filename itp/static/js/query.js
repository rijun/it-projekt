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
