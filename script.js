function onLoad() {}

// MAP CONFIGURAITON
let orthophotosLayer = L.tileLayer(
  `https://wxs.ign.fr/decouverte/geoportail/wmts?service=WMTS&version=1.0.0&request=GetTile
&tilematrixset=PM
&tilematrix={z}
&tilecol={x}
&tilerow={y}
&layer=ORTHOIMAGERY.ORTHOPHOTOS
&format=image/jpeg
&style=normal`,
  {
    id: 'orthophotos',
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }
);
let actualMapLayer = L.tileLayer(
  'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  {
    id: 'basicMap',
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }
);
var map = L.map('map').setView([43.47687608781454, -1.4947795225488858], 13);
var baseMaps = {
  OpenStreetMap: actualMapLayer,
  orthophotos: orthophotosLayer,
};
map.addLayer(baseMaps.OpenStreetMap);

// declaration des variables
let pointNumber = 0;
let markers = [];
let coordsMarkers = [];
let routing;
let longitudeStart;
let latitudeStart;
let longitudeEnd;
let latitudeEnd;
let ligneItineraire;
let myLine;
let geoJsonData;

const redIcon = new L.Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
const greenIcon = new L.Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

async function onMapClick(e) {
  let xCursor = e.latlng.lng; // x = longitude
  let yCursor = e.latlng.lat; // y = latitude
  if (pointNumber === 0) {
    resetPoints();
    pointNumber = 1;
    await showCoordonateStart(yCursor, xCursor);
    markers.push(L.marker([yCursor, xCursor], { icon: greenIcon }).addTo(map));
  } else if (pointNumber === 1) {
    pointNumber = 0;
    markers.push(L.marker([yCursor, xCursor], { icon: redIcon }).addTo(map));
    await showCoordonateEnd(yCursor, xCursor);
    await calculateItineraire();
    initGraph();
  }
}

map.on('click', onMapClick);

async function showCoordonateStart(longitude, latitude) {
  let itinairaireElement = document.getElementById('point-depart');
  let address = await fetchAddress(longitude, latitude);
  longitudeStart = longitude;
  latitudeStart = latitude;
  itinairaireElement.innerText = address;
}
async function showCoordonateEnd(longitude, latitude) {
  let itinairaireElement = document.getElementById('point-arrivee');
  let address = await fetchAddress(longitude, latitude);
  longitudeEnd = longitude;
  latitudeEnd = latitude;
  itinairaireElement.innerText = address;
}

async function calculateItineraire() {
  routing = await fetchItineraire(
    longitudeStart,
    latitudeStart,
    longitudeEnd,
    latitudeEnd
  );
}
async function fetchItineraire(
  longitudeStart,
  latitudeStart,
  longitudeEnd,
  latitudeEnd
) {
  const URL = `https://wxs.ign.fr/calcul/geoportail/itineraire/rest/1.0.0/route?resource=bdtopo-osrm&start=${latitudeStart}%2C${longitudeStart}&end=${latitudeEnd}%2C${longitudeEnd}&profile=pedestrian`;
  let response = await fetch(URL);
  if (!response.ok) {
    const message = "Erreur lors du chargement de l'itineraire";
    alert(message);
  }
  let result = response.json();
  geoJsonData = await result;
  console.log(geoJsonData);
  setRouteTrouvee(geoJsonData.duration, geoJsonData.distance);

  myLine = geoJsonData.geometry;

  ligneItineraire = L.geoJSON(myLine).addTo(map);
  map.fitBounds(ligneItineraire.getBounds());
}

function setRouteTrouvee(duration, distance) {
  // display the duration and the distance of the current route
  // duration in minutes and distance in meters

  let pathFoundElement = document.getElementById('path-found');
  pathFoundElement.innerText =
    Math.round(duration) +
    ' minutes - ' +
    Math.round(distance / 10) / 100 +
    ' km';
}

async function fetchAddress(x, y) {
  let promises = fetch(
    'https://wxs.ign.fr/essentiels/geoportail/geocodage/rest/0.1/reverse?lon=' +
      y +
      '&lat=' +
      x
  );
  let result = (await promises).json();
  let data = await result;
  if (data.features.length) {
    return data.features[0].properties.label;
  } else {
    alert('Attention: Aucune address trouvée pour ce point.');
  }

  return `No address found. x:${x} y:${y}`;
}

function resetPoints() {
  resetMarkers();
  resetLayers();
}

function resetMarkers() {
  for (let i = 0; i < markers.length; i++) {
    map.removeLayer(markers[i]);
  }
}
function resetLayers() {
  if (!!ligneItineraire) {
    map.removeLayer(ligneItineraire);
  }
}

function resetCoords() {
  resetMarkers();
  resetLayers();
  pointNumber = 0;
  markers = [];
  coordsMarkers = [];
  let itinairaireElement = document.getElementById('point-depart');
  itinairaireElement.innerText = '';
  let itinairaireElemen2 = document.getElementById('point-arrivee');
  itinairaireElemen2.innerText = '';
  let pathFoundElement = document.getElementById('path-found');
  pathFoundElement.innerText = '';
}

async function initGraph() {
  // affiche le graphique avec en abscisse la distance et en ordonnée la hauteur
  let allLongitudes = '';
  let allLatitudes = '';
  let distanceLine = geoJsonData.distance;
  let dataForGraph = {
    x: [],
    y: [],
    type: 'scatter',
  };
  for (let i = 0; i < 15; i++) {
    let portionKm = (distanceLine / 15) * i;
    along = turf.along(myLine, portionKm / 1000);
    let latitude = along.geometry.coordinates[1];
    let longitude = along.geometry.coordinates[0];

    allLatitudes += latitude + (i === 14 ? '' : '|');
    allLongitudes += longitude + (i === 14 ? '' : '|');
    dataForGraph.x.push(portionKm);
  }
  allLongitudes.slice(0, -1); // -1...
  allLatitudes.slice(0, -1); // 43...
  console.log('latitudes: ');
  console.log(allLatitudes);
  console.log('long: ');
  console.log(allLongitudes);

  let url = `https://wxs.ign.fr/calcul/alti/rest/elevation.json?lon=${allLongitudes}&lat=${allLatitudes}&zonly=true&indent=true`;
  console.log(url);
  let promise = fetch(url);
  let result = (await promise).json();
  let dataFetchElevation = await result;
  console.log(dataFetchElevation);
  dataForGraph.y = dataFetchElevation.elevations;
  var layout = {
    autosize: false,
    width: 800,
    height: 250,
    margin: {
      l: 0,
      r: 0,
      b: 0,
      t: 30,
      pad: 0,
    },
  };
  var data = [dataForGraph];
  Plotly.newPlot('graph', data, layout);
}

document
  .getElementById('selectMapType')
  .addEventListener('change', (event) => onMapTypeChanged(event));

function onMapTypeChanged(e) {
  console.log(e);
  removeAllLayers();
  if (e.target.value === 'basicMap') {
    map.addLayer(baseMaps.OpenStreetMap);
  } else if (e.target.value === 'orthophotos') {
    map.addLayer(baseMaps.orthophotos);
  }
}
function removeAllLayers() {
  for (const layer of Object.keys(baseMaps)) {
    map.removeLayer(baseMaps[layer]);
  }
}
