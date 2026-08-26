// =========================================
// HWANGE HUMAN-WILDLIFE CONFLICT DASHBOARD
// COMPLETE JAVASCRIPT
// =========================================


// =========================================
// 1. CREATE THE MAP
// =========================================

const map = L.map("map");


// =========================================
// 2. CREATE MAP PANES
// =========================================

// Rivers are drawn below conflict points
map.createPane("riversPane");
map.getPane("riversPane").style.zIndex = 400;

// Conflict points are always drawn above rivers
map.createPane("conflictPane");
map.getPane("conflictPane").style.zIndex = 450;


// =========================================
// 3. ADD BASEMAP
// =========================================

const baseMap = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 18,
        attribution: "&copy; OpenStreetMap contributors"
    }
).addTo(map);


// =========================================
// 4. CREATE LAYER VARIABLES
// =========================================

let allConflictFeatures = [];

let boundaryLayer = null;
let riversLayer = null;
let conflictLayer = null;

let conflictChart = null;
let speciesChart = null;

let layerControl = null;


// =========================================
// 5. GET HTML ELEMENTS
// =========================================

const districtFilter = document.getElementById("districtFilter");
const conflictFilter = document.getElementById("conflictFilter");
const speciesFilter = document.getElementById("speciesFilter");
const severityFilter = document.getElementById("severityFilter");
const resetFilters = document.getElementById("resetFilters");


// =========================================
// 6. LOAD STUDY AREA BOUNDARY
// =========================================

fetch("./data/boundary.geojson")
    .then(response => {
        if (!response.ok) {
            throw new Error(
                "Could not load boundary.geojson. Status: " +
                response.status
            );
        }

        return response.json();
    })
    .then(data => {

        boundaryLayer = L.geoJSON(data, {
            style: {
                color: "#cc0000",
                weight: 3,
                fillColor: "#ffff00",
                fillOpacity: 0.15
            }
        }).addTo(map);

        console.log(
            "Boundary loaded:",
            data.features.length,
            "feature(s)"
        );

        const bounds = boundaryLayer.getBounds();

        if (bounds.isValid()) {
            map.fitBounds(bounds, {
                padding: [20, 20]
            });
        }

        updateLayerControl();

    })
    .catch(error => {
        console.error("BOUNDARY ERROR:", error);
    });


// =========================================
// 7. LOAD RIVERS
// =========================================

fetch("./data/rivers.geojson")
    .then(response => {
        if (!response.ok) {
            throw new Error(
                "Could not load rivers.geojson. Status: " +
                response.status
            );
        }

        return response.json();
    })
    .then(data => {

        riversLayer = L.geoJSON(data, {
            pane: "riversPane",

            style: {
                color: "#1976d2",
                weight: 2,
                opacity: 0.9
            }
        }).addTo(map);

        console.log(
            "Rivers loaded:",
            data.features.length,
            "feature(s)"
        );

        updateLayerControl();

    })
    .catch(error => {
        console.error("RIVERS ERROR:", error);
    });


// =========================================
// 8. LOAD CONFLICT DATA
// =========================================

fetch("./data/conflict_records.geojson")
    .then(response => {
        if (!response.ok) {
            throw new Error(
                "Could not load conflict_records.geojson. Status: " +
                response.status
            );
        }

        return response.json();
    })
    .then(data => {

        allConflictFeatures = data.features;

        console.log(
            "Conflict events loaded:",
            allConflictFeatures.length
        );

        // Populate all filter dropdowns
        populateFilters();

        // Display the dashboard
        updateDashboard();

    })
    .catch(error => {
        console.error("CONFLICT DATA ERROR:", error);
    });


// =========================================
// 9. UPDATE LAYER CONTROL
// =========================================

function updateLayerControl() {

    // Remove the old layer control
    if (layerControl) {
        map.removeControl(layerControl);
    }

    const baseLayers = {
        "OpenStreetMap": baseMap
    };

    const overlayLayers = {};

    if (boundaryLayer) {
        overlayLayers["Study Area Boundary"] = boundaryLayer;
    }

    if (riversLayer) {
        overlayLayers["Rivers"] = riversLayer;
    }

    if (conflictLayer) {
        overlayLayers["Conflict Events"] = conflictLayer;
    }

    layerControl = L.control.layers(
        baseLayers,
        overlayLayers,
        {
            collapsed: false,
            position: "topright"
        }
    ).addTo(map);
}


// =========================================
// 10. POPULATE FILTERS
// =========================================

function populateFilters() {

    populateSelect(
        districtFilter,
        "District"
    );

    populateSelect(
        conflictFilter,
        "Conflict_Type"
    );

    populateSelect(
        speciesFilter,
        "Species"
    );

    populateSelect(
        severityFilter,
        "Severity"
    );
}


// =========================================
// 11. POPULATE ONE SELECT MENU
// =========================================

function populateSelect(selectElement, propertyName) {

    const values = allConflictFeatures
        .map(feature => feature.properties[propertyName])
        .filter(value =>
            value !== null &&
            value !== undefined &&
            value !== ""
        );

    const uniqueValues =
        [...new Set(values)].sort();

    uniqueValues.forEach(value => {

        const option =
            document.createElement("option");

        option.value = value;
        option.textContent = value;

        selectElement.appendChild(option);
    });
}


// =========================================
// 12. FILTER CONFLICT DATA
// =========================================

function getFilteredFeatures() {

    const selectedDistrict =
        districtFilter.value;

    const selectedConflict =
        conflictFilter.value;

    const selectedSpecies =
        speciesFilter.value;

    const selectedSeverity =
        severityFilter.value;


    return allConflictFeatures.filter(feature => {

        const p = feature.properties;

        const districtMatch =
            selectedDistrict === "All" ||
            p.District === selectedDistrict;

        const conflictMatch =
            selectedConflict === "All" ||
            p.Conflict_Type === selectedConflict;

        const speciesMatch =
            selectedSpecies === "All" ||
            p.Species === selectedSpecies;

        const severityMatch =
            selectedSeverity === "All" ||
            p.Severity === selectedSeverity;

        return (
            districtMatch &&
            conflictMatch &&
            speciesMatch &&
            severityMatch
        );
    });
}


// =========================================
// 13. DISPLAY CONFLICT POINTS
// =========================================

function displayConflicts(features) {

    const wasVisible =
        conflictLayer
            ? map.hasLayer(conflictLayer)
            : true;

    // Remove the old conflict layer
    if (conflictLayer) {
        map.removeLayer(conflictLayer);
    }

    // Create the new filtered conflict layer
    conflictLayer = L.geoJSON(
        {
            type: "FeatureCollection",
            features: features
        },
        {
            pane: "conflictPane",

            // Create point symbols
            pointToLayer: function(feature, latlng) {

                return L.circleMarker(
                    latlng,
                    {
                        pane: "conflictPane",
                        radius: 4,
                        color: "#8b0000",
                        weight: 2,
                        fillColor: "#ff0000",
                        fillOpacity: 0.85
                    }
                );
            },

            // Create point popups
            onEachFeature: function(feature, layer) {

                const p = feature.properties;

                const popupContent = `
                    <div class="popup-content">

                        <h3>Conflict Event</h3>

                        <p>
                            <strong>District:</strong>
                            ${p.District ?? "Not available"}
                        </p>

                        <p>
                            <strong>Species:</strong>
                            ${p.Species ?? "Not available"}
                        </p>

                        <p>
                            <strong>Conflict Type:</strong>
                            ${p.Conflict_Type ?? "Not available"}
                        </p>

                        <p>
                            <strong>Severity:</strong>
                            ${p.Severity ?? "Not available"}
                        </p>

                        <p>
                            <strong>Land Use:</strong>
                            ${p.Land_Use ?? "Not available"}
                        </p>

                        <p>
                            <strong>Mitigation Action:</strong>
                            ${p.Mitigation_Action ?? "Not available"}
                        </p>

                        <p>
                            <strong>Latitude:</strong>
                            ${p.Latitude ?? "Not available"}
                        </p>

                        <p>
                            <strong>Longitude:</strong>
                            ${p.Longitude ?? "Not available"}
                        </p>

                    </div>
                `;

                layer.bindPopup(popupContent);
            }
        }
    );

    // Add the new layer only if it was visible
    if (wasVisible) {
        conflictLayer.addTo(map);
    }

    // Refresh the layer control
    updateLayerControl();
}


// =========================================
// 14. UPDATE STATISTICS
// =========================================

function updateStatistics(features) {

    // Total conflict events
    document.getElementById(
        "totalEvents"
    ).textContent =
        features.length;


    // Number of species
    const species = new Set(
        features
            .map(feature =>
                feature.properties.Species
            )
            .filter(Boolean)
    );

    document.getElementById(
        "speciesCount"
    ).textContent =
        species.size;
}


// =========================================
// 15. COUNT DATA FOR CHARTS
// =========================================

function countByProperty(
    features,
    propertyName
) {

    const counts = {};

    features.forEach(feature => {

        const value =
            feature.properties[propertyName] ||
            "Unknown";

        if (counts[value]) {
            counts[value]++;
        } else {
            counts[value] = 1;
        }
    });

    return counts;
}


// =========================================
// 16. CREATE OR UPDATE A CHART
// =========================================

function createChart(
    chartId,
    existingChart,
    chartTitle,
    dataCounts
) {

    // Destroy the previous chart
    if (existingChart) {
        existingChart.destroy();
    }

    const labels =
        Object.keys(dataCounts);

    const values =
        Object.values(dataCounts);

    const canvas =
        document.getElementById(chartId);

    const ctx =
        canvas.getContext("2d");

    return new Chart(ctx, {

        type: "bar",

        data: {
            labels: labels,

            datasets: [
                {
                    label: chartTitle,
                    data: values
                }
            ]
        },

        options: {
            responsive: true,

            plugins: {
                legend: {
                    display: false
                }
            },

            scales: {
                y: {
                    beginAtZero: true,

                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}


// =========================================
// 17. UPDATE REMAINING CHARTS
// =========================================

function updateCharts(features) {

    const conflictCounts =
        countByProperty(
            features,
            "Conflict_Type"
        );

    const speciesCounts =
        countByProperty(
            features,
            "Species"
        );


    conflictChart = createChart(
        "conflictChart",
        conflictChart,
        "Number of Events",
        conflictCounts
    );

    speciesChart = createChart(
        "speciesChart",
        speciesChart,
        "Number of Events",
        speciesCounts
    );
}


// =========================================
// 18. UPDATE THE ENTIRE DASHBOARD
// =========================================

function updateDashboard() {

    const filteredFeatures =
        getFilteredFeatures();

    // Update map points
    displayConflicts(filteredFeatures);

    // Update statistics
    updateStatistics(filteredFeatures);

    // Update charts
    updateCharts(filteredFeatures);
}


// =========================================
// 19. FILTER EVENT LISTENERS
// =========================================

districtFilter.addEventListener(
    "change",
    updateDashboard
);

conflictFilter.addEventListener(
    "change",
    updateDashboard
);

speciesFilter.addEventListener(
    "change",
    updateDashboard
);

severityFilter.addEventListener(
    "change",
    updateDashboard
);


// =========================================
// 20. RESET FILTERS
// =========================================

resetFilters.addEventListener(
    "click",
    function() {

        districtFilter.value = "All";
        conflictFilter.value = "All";
        speciesFilter.value = "All";
        severityFilter.value = "All";

        updateDashboard();
    }
);
