let chartSettings = {
    type: "bar",
    data: {
        datasets: [{
            label: "Lastgang",
            backgroundColor: "rgba(255, 128, 0, 0.2)",
            borderColor: "rgb(255, 128, 0)",
            borderWidth: 1,
            yAxisID: "y-axis-load",
        }]
    },
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
                type: "linear",
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
                type: "linear",
                display: false,
                position: "right",
                id: "y-axis-energy",
                scaleLabel: {
                    display: true,
                    labelString: "Zählerstand [kWh]",
                    fontSize: 14
                },
                gridLines: {
                    drawOnChartArea: false,
                }
            }]
        },
        tooltips: {
            mode: "index",
            // Custom tooltip settings
            callbacks: {
                label: function (tooltipItem, data) {
                    if (tooltipItem.datasetIndex === 0) {
                        return tooltipItem.yLabel + ' ' + getCurrentUnit();
                    } else {
                        return tooltipItem.yLabel + " kWh";
                    }
                },
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