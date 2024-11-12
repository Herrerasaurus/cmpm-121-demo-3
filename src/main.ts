import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import "./leafletWorkaround.ts";
import luck from "./luck.ts";

const OAKES_CLASSROOM = leaflet.latLng(36.98949379578401, -122.06277128548504);

const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const CACHE_SPAWN_PROBABILITY = 0.1;

// Create map centered on Oakes Classroom
const map = leaflet.map(document.getElementById("map")!, {
  center: OAKES_CLASSROOM,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

// Populate map with OpenStreetMap tiles
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: GAMEPLAY_ZOOM_LEVEL,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

// Add player Marker to map
const playerMarker = leaflet.marker(OAKES_CLASSROOM);
playerMarker.bindTooltip("You are here!");
playerMarker.addTo(map);

// Display player's points
let playerPoints = 0;
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "No points yet...";

// Add caches to the map by cell numbers
interface Cache {
  coins: number;
  cell: Cell;
}

interface Cell {
  i: number;
  j: number;
}

function spawnCache(c: Cache) {
  // Convert cell numbers into lat/lng bounds
  const origin = OAKES_CLASSROOM;
  const bounds = leaflet.latLngBounds([
    [
      origin.lat + c.cell.i * TILE_DEGREES,
      origin.lng + c.cell.j * TILE_DEGREES,
    ],
    [
      origin.lat + (c.cell.i + 1) * TILE_DEGREES,
      origin.lng + (c.cell.j + 1) * TILE_DEGREES,
    ],
  ]);

  const rect = leaflet.rectangle(bounds);
  rect.addTo(map);

  // Add cache Markers to map
  // got code for changing marker color from https://stackoverflow.com/questions/23567203/leaflet-changing-marker-color
  const greenIcon = new leaflet.Icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  const cacheMarker = leaflet.marker(bounds.getCenter(), { icon: greenIcon });
  cacheMarker.addTo(map);

  // Add popup to cache
  cacheMarker.bindPopup(() => {
    // Determinitically generate cache value
    c.coins = Math.floor(
      luck([c.cell.i, c.cell.j, "initialValue"].toString()) * 100,
    );

    // Allow player to collect/deposit coins from/to cache
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `
                <div>There is a cache here at "${c.cell.i},${c.cell.j}". It has value <span id="value">${c.coins}</span>.</div>
                <button id="collect">collect</button> <button id="deposit">deposit</button>`;

    // add or remove coins from cache
    popupDiv
      .querySelector<HTMLButtonElement>("#collect")!
      .addEventListener("click", () => {
        CollectCoin(c);
        popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML = c.coins
          .toString();
      });
    popupDiv
      .querySelector<HTMLButtonElement>("#deposit")!
      .addEventListener("click", () => {
        DepositCoin(c);
        popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML = c.coins
          .toString();
      });

    return popupDiv;
  });
}

function CollectCoin(cache: Cache) {
  playerPoints++;
  cache.coins--;
  statusPanel.innerHTML = `${playerPoints} points accumulated`;
}

function DepositCoin(cache: Cache) {
  playerPoints--;
  cache.coins++;
  statusPanel.innerHTML = `${playerPoints} points accumulated`;
}

// Deterministically spawn caches in the neighborhood
for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
  for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
    if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
      spawnCache({ coins: 0, cell: { i, j } });
    }
  }
}
