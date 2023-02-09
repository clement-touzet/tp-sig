function onLoad() {}

var map = L.map('map').setView([43.47687608781454, -1.4947795225488858], 13);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

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
    pointNumber = 1;
    await showCoordonateStart(yCursor, xCursor);
    markers.push(L.marker([yCursor, xCursor], { icon: greenIcon }).addTo(map));
  } else if (pointNumber === 1) {
    pointNumber = 2;
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
  let promise = fetch(URL);
  let result = (await promise).json();
  geoJsonData = await result;

  myLine = geoJsonData.geometry;

  ligneItineraire = L.geoJSON(myLine).addTo(map);
  map.fitBounds(ligneItineraire.getBounds());
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
  if (data.features !== null) {
    return data.features[0].properties.label;
  }

  return `No address found. x:${x} y:${y}`;
}

function resetCoords() {
  for (let i = 0; i < markers.length; i++) {
    map.removeLayer(markers[i]);
  }
  map.removeLayer(ligneItineraire);

  pointNumber = 0;
  markers = [];
  coordsMarkers = [];
  let itinairaireElement = document.getElementById('point-depart');
  itinairaireElement.innerText = '';
  let itinairaireElemen2 = document.getElementById('point-arrivee');
  itinairaireElemen2.innerText = '';
}

async function initGraph() {
  // affiche le graphique avec en abscisse la distance et en ordonnée la hauteur
  let allLongitudes = '';
  let allLatitudes = '';
  let distanceLine = geoJsonData.distance;
  for (let i = 0; i < 15; i++) {
    let portionKm = (distanceLine / 15) * i;
    along = turf.along(myLine, portionKm / 1000);
    console.log(along);
    L.marker([
      along.geometry.coordinates[1],
      along.geometry.coordinates[0],
    ]).addTo(map);
  }

  for (const line of myLine.coordinates) {
    allLatitudes += line[0] + '|';
    allLongitudes += line[1] + '|';
  }
  allLongitudes.slice(0, -1); // -1...
  allLatitudes.slice(0, -1); // 43...

  let url = `https://wxs.ign.fr/calcul/alti/rest/elevation.json?lon=${allLongitudes}&lat=${allLatitudes}&zonly=true&indent=true`;
  console.log(url);
  let promise = fetch(url);
  let result = (await promise).json();
  let dataFetchElevation = await result;
  console.log(dataFetchElevation);
  var trace1 = {
    x: [1, 2, 3, 4],
    y: [10, 15, 13, 17],
    type: 'scatter',
  };
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
  var data = [trace1];
  Plotly.newPlot('graph', data, layout);
}
