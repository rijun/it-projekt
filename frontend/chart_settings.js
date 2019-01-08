let chartSettings = {
    type: "bar",
    // Chart data
    data: {
        datasets: [{
            label: "Lastgang",
            backgroundColor: "rgba(255, 128, 0, 0.2)",
            borderColor: "rgb(255, 128, 0)",
            borderWidth: 1,
            yAxisID: "y-axis-load",
        }]
    },
    // Chart options
    options: {
        scales: {
            xAxes: [{
                scaleLabel: {
                    display: true,
                    labelString: "Zeitpunkt",
                    fontSize: 14
                },
                gridLines: {
                    offsetGridLines: true
                }
            }],
            yAxes: [{
                type: "linear", // only linear but allow scale type registration. This allows extensions to exist solely for log scale for instance
                display: true,
                position: "left",
                id: "y-axis-load",
                scaleLabel: {
                    display: true,
                    labelString: "Lastgang",
                    fontSize: 14
                },
                ticks: {
                    beginAtZero: true
                }
            }, {
                type: "linear", // only linear but allow scale type registration. This allows extensions to  exist solely for log scale for instance
                display: false,
                position: "right",
                id: "y-axis-energy",
                scaleLabel: {
                    display: true,
                    labelString: "Zählerstand [kWh]",
                    fontSize: 14
                },
                gridLines: {
                    drawOnChartArea: false, // only want the grid lines for one axis to show up
                }
            }]
        },
        tooltips: {
            mode: "index",
            callbacks: {
                label: function (tooltipItem, data) {
                    if (tooltipItem.datasetIndex === 0) {
                        return tooltipItem.yLabel + ' ' + getCurrentUnit();
                    } else {
                        return tooltipItem.yLabel + " kWh";
                    }
                },
                // Use the footer callback to display the sum of the items showing in the tooltip
                footer: function (tooltipItem, data) {
                    let kwhPrice;
                    let load = tooltipItem[0].yLabel;
                    let price = document.getElementById("price-select").value / 100;
                    kwhPrice = calculatePrice(load, price);
                    return "Kosten: " + kwhPrice + ' €';
                },
            },
            footerFontStyle: "normal"
        }
    }
}