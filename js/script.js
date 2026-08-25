// ---- CONFIG ----
// Path is relative, so it works both locally and on Netlify
const GEOJSON_URL = "data/Hwange_conflictdata.geojson","boundary.geojson";

// ---- MAP INIT ----
const map = L.map("map").setView([-17.8252, 31.0335], 6); // default: Zimbabwe, change as needed

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19
}).addTo(map);

// ---- STYLE FUNCTIONS ----
function styleFeature(feature) {
  return {
    color: "#2563eb",
    weight: 2,
    fillColor: "#3b82f6",
    fillOpacity: 0.4
  };
}

function pointToLayer(feature, latlng) {
  return L.circleMarker(latlng, {
    radius: 6,
    fillColor: "#e11d48",
    color: "#fff",
    weight: 1,
    fillOpacity: 0.9
  });
}

// ---- INFO PANEL ----
const infoPanel = document.getElementById("info-panel");
const infoContent = document.getElementById("info-content");
const closePanelBtn = document.getElementById("close-panel");

function showInfo(properties) {
  let rows = "";
  for (const key in properties) {
    rows += `<tr><td>${key}</td><td>${properties[key]}</td></tr>`;
  }
  infoContent.innerHTML = `
    <h2>${properties.name || "Feature Details"}</h2>
    <table>${rows}</table>
  `;
  infoPanel.classList.remove("hidden");
}

closePanelBtn.addEventListener("click", () => {
  infoPanel.classList.add("hidden");
});

// ---- FETCH + RENDER GEOJSON ----
async function loadGeoJSON() {
  try {
    const response = await fetch(GEOJSON_URL);
    if (!response.ok) {
      throw new Error(`Failed to load GeoJSON: ${response.status}`);
    }
    const geoData = await response.json();

    const geoLayer = L.geoJSON(geoData, {
      style: styleFeature,
      pointToLayer: pointToLayer,
      onEachFeature: (feature, layer) => {
        layer.on("click", () => {
          if (feature.properties) {
            showInfo(feature.properties);
          }
        });

        if (feature.properties && feature.properties.name) {
          layer.bindTooltip(feature.properties.name, { sticky: true });
        }
      }
    }).addTo(map);

    // Zoom map to fit the loaded data
    if (geoLayer.getBounds().isValid()) {
      map.fitBounds(geoLayer.getBounds(), { padding: [30, 30] });
    }
  } catch (error) {
    console.error(error);
    infoContent.innerHTML = `<p style="color:red;">Could not load map data. Check that data/data.geojson exists and is valid.</p>`;
    infoPanel.classList.remove("hidden");
  }
}

loadGeoJSON();
