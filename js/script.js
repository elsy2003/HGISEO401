// ---- CONFIG ----
const DATA_FILES = {
  boundary: "data/boundary.geojson",
  roads: "data/roads.geojson",
  rivers: "data/rivers.geojson",
  conflict: "data/Hwange_conflictdata.geojson"
};

// ---- MAP INIT ----
const map = L.map("map").setView([-17.8252, 31.0335], 6); // default: Zimbabwe, adjust as needed

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19
}).addTo(map);

// ---- STYLES PER LAYER TYPE ----
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
    fillOpacity: 0
  },
  rivers: {
    color: "#2563eb",
    weight: 2,
    fillOpacity: 0
  },
  conflict: {
    color: "#ff0000",
    weight: 2,
    fillOpacity: 0
  }
};

// ---- INFO PANEL ----
const infoPanel = document.getElementById("info-panel");
const infoContent = document.getElementById("info-content");
const closePanelBtn = document.getElementById("close-panel");

function showInfo(properties, layerName) {
  let rows = "";
  for (const key in properties) {
    rows += `<tr><td>${key}</td><td>${properties[key]}</td></tr>`;
  }
  infoContent.innerHTML = `
    <h2>${properties.name || layerName}</h2>
    <table>${rows}</table>
  `;
  infoPanel.classList.remove("hidden");
}

closePanelBtn.addEventListener("click", () => {
  infoPanel.classList.add("hidden");
});

// ---- STORE LOADED LAYERS ----
const layers = {}; // e.g. layers.boundary = L.geoJSON(...)

// ---- LOAD A SINGLE GEOJSON FILE AND ADD AS A LAYER ----
async function loadLayer(name, url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load ${name}: ${response.status}`);
    }
    const geoData = await response.json();

    const geoLayer = L.geoJSON(geoData, {
      style: () => layerStyles[name],
      pointToLayer: (feature, latlng) =>
        L.circleMarker(latlng, {
          radius: 5,
          fillColor: layerStyles[name].color,
          color: "#fff",
          weight: 1,
          fillOpacity: 0.9
        }),
      onEachFeature: (feature, layer) => {
        layer.on("click", () => {
          if (feature.properties) {
            showInfo(feature.properties, name);
          }
        });
        if (feature.properties && feature.properties.name) {
          layer.bindTooltip(feature.properties.name, { sticky: true });
        }
      }
    });

    layers[name] = geoLayer;
    geoLayer.addTo(map); // visible by default, matches checked checkboxes

    return geoLayer;
  } catch (error) {
    console.error(error);
    return null;
  }
}

// ---- LOAD ALL LAYERS, THEN FIT MAP TO COMBINED BOUNDS ----
async function loadAllLayers() {
  const loadPromises = Object.entries(DATA_FILES).map(([name, url]) =>
    loadLayer(name, url)
  );

  const loadedLayers = await Promise.all(loadPromises);

  const group = L.featureGroup(loadedLayers.filter(l => l !== null));
  if (group.getLayers().length > 0) {
    map.fitBounds(group.getBounds(), { padding: [30, 30] });
  }
}

loadAllLayers();

// ---- TOGGLE CONTROLS ----
function setupToggle(checkboxId, layerName) {
  const checkbox = document.getElementById(checkboxId);
  if (!checkbox) return; // guard in case an HTML id doesn't match

  checkbox.addEventListener("change", (e) => {
    const layer = layers[layerName];
    if (!layer) return; // not loaded yet or failed to load

    if (e.target.checked) {
      map.addLayer(layer);
    } else {
      map.removeLayer(layer);
    }
  });
}

setupToggle("toggle-boundary", "boundary");
setupToggle("toggle-roads", "roads");
setupToggle("toggle-rivers", "rivers");
setupToggle("toggle-Hwange_conflictdata", "conflict");