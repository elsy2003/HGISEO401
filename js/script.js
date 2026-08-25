// ======================================================
// CONFIGURATION
// ======================================================

const DATA_FILES = {
  boundary: "data/boundary.geojson",
  roads: "data/roads.geojson",
  rivers: "data/rivers.geojson",
  conflict: "data/Hwange_conflictdata.geojson"
};


// ======================================================
// MAP INITIALIZATION
// ======================================================

// Temporary starting location.
// The map will automatically zoom to the study area
// after the boundary GeoJSON has successfully loaded.
const map = L.map("map", {
  center: [-18.6, 26.5],
  zoom: 9
});


// OpenStreetMap basemap
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19
}).addTo(map);


// ======================================================
// LAYER STYLES
// ======================================================

const layerStyles = {

  boundary: {
    color: "#1e2327",
    weight: 2,
    fillColor: "#94a3b8",
    fillOpacity: 0.05,
    dashArray: "4"
  },

  roads: {
    color: "#e67e22",
    weight: 2,
    opacity: 0.9
  },

  rivers: {
    color: "#2563eb",
    weight: 2,
    opacity: 0.9
  },

  conflict: {
    color: "#ff0000",
    weight: 2,
    fillOpacity: 0
  }

};


// ======================================================
// INFO PANEL
// ======================================================

const infoPanel = document.getElementById("info-panel");
const infoContent = document.getElementById("info-content");
const closePanelBtn = document.getElementById("close-panel");


function showInfo(properties, layerName) {

  let rows = "";

  for (const key in properties) {

    rows += `
      <tr>
        <td>${key}</td>
        <td>${properties[key]}</td>
      </tr>
    `;

  }

  infoContent.innerHTML = `
    <h2>${properties.name || properties.NAME || layerName}</h2>
    <table>
      ${rows}
    </table>
  `;

  infoPanel.classList.remove("hidden");
}


if (closePanelBtn) {

  closePanelBtn.addEventListener("click", () => {
    infoPanel.classList.add("hidden");
  });

}


// ======================================================
// STORE LOADED LAYERS
// ======================================================

const layers = {};


// ======================================================
// LOAD ONE GEOJSON LAYER
// ======================================================

async function loadLayer(name, url) {

  try {

    console.log(`Loading ${name}: ${url}`);

    const response = await fetch(url);

    // Check if file was found
    if (!response.ok) {

      throw new Error(
        `${name} failed to load. HTTP status: ${response.status}. URL: ${url}`
      );

    }

    const geoData = await response.json();

    // Check that the file actually contains GeoJSON
    if (!geoData || !geoData.type) {

      throw new Error(
        `${name} does not appear to be valid GeoJSON.`
      );

    }

    console.log(
      `${name} loaded successfully.`,
      geoData
    );


    // Create Leaflet GeoJSON layer
    const geoLayer = L.geoJSON(geoData, {

      // ----------------------------------------------
      // Polygon / Line styling
      // ----------------------------------------------

      style: function () {

        return layerStyles[name];

      },


      // ----------------------------------------------
      // Point styling
      // ----------------------------------------------

      pointToLayer: function (feature, latlng) {

        return L.circleMarker(latlng, {

          radius: 5,

          fillColor: layerStyles[name].color,

          color: "#ffffff",

          weight: 1,

          fillOpacity: 0.9

        });

      },


      // ----------------------------------------------
      // Feature interaction
      // ----------------------------------------------

      onEachFeature: function (feature, layer) {

        if (feature.properties) {

          // Click feature to open information panel
          layer.on("click", function () {

            showInfo(
              feature.properties,
              name
            );

          });


          // Tooltip
          const featureName =
            feature.properties.name ||
            feature.properties.NAME;

          if (featureName) {

            layer.bindTooltip(
              featureName,
              {
                sticky: true
              }
            );

          }

        }

      }

    });


    // Store layer
    layers[name] = geoLayer;


    // Add layer to map
    geoLayer.addTo(map);


    return geoLayer;


  } catch (error) {

    console.error(
      `ERROR loading ${name}:`,
      error
    );

    return null;

  }

}


// ======================================================
// LOAD ALL LAYERS
// ======================================================

async function loadAllLayers() {

  console.log("Starting GeoJSON loading...");


  // ----------------------------------------------------
  // Load the boundary FIRST
  // ----------------------------------------------------

  const boundaryLayer = await loadLayer(
    "boundary",
    DATA_FILES.boundary
  );


  // ----------------------------------------------------
  // AUTOMATICALLY ZOOM TO STUDY AREA
  // ----------------------------------------------------

  if (boundaryLayer) {

    try {

      const boundaryBounds =
        boundaryLayer.getBounds();

      if (boundaryBounds.isValid()) {

        console.log(
          "Zooming to study area:",
          boundaryBounds
        );

        map.fitBounds(
          boundaryBounds,
          {
            padding: [30, 30],
            maxZoom: 13
          }
        );

      } else {

        console.warn(
          "Boundary loaded, but its geographic bounds are invalid."
        );

      }

    } catch (error) {

      console.error(
        "Could not zoom to study area:",
        error
      );

    }

  } else {

    console.warn(
      "Boundary could not be loaded. Map will remain at default location."
    );

  }


  // ----------------------------------------------------
  // Load remaining layers
  // ----------------------------------------------------

  await Promise.all([

    loadLayer(
      "roads",
      DATA_FILES.roads
    ),

    loadLayer(
      "rivers",
      DATA_FILES.rivers
    ),

    loadLayer(
      "conflict",
      DATA_FILES.conflict
    )

  ]);


  // ----------------------------------------------------
  // Force Leaflet to recalculate map size
  // ----------------------------------------------------

  setTimeout(function () {

    map.invalidateSize();

  }, 300);


  console.log(
    "Finished loading all layers.",
    layers
  );

}


// Start loading
loadAllLayers();


// ======================================================
// LAYER TOGGLE CONTROLS
// ======================================================

function setupToggle(
  checkboxId,
  layerName
) {

  const checkbox =
    document.getElementById(checkboxId);


  if (!checkbox) {

    console.warn(
      `Checkbox not found: ${checkboxId}`
    );

    return;

  }


  checkbox.addEventListener(
    "change",
    function (event) {

      const layer =
        layers[layerName];


      if (!layer) {

        console.warn(
          `Layer "${layerName}" has not loaded.`
        );

        return;

      }


      if (event.target.checked) {

        map.addLayer(layer);

      } else {

        map.removeLayer(layer);

      }

    }
  );

}


// Boundary
setupToggle(
  "toggle-boundary",
  "boundary"
);


// Roads
setupToggle(
  "toggle-roads",
  "roads"
);


// Rivers
setupToggle(
  "toggle-rivers",
  "rivers"
);


// Conflict
setupToggle(
  "toggle-Hwange_conflictdata",
  "conflict"
);