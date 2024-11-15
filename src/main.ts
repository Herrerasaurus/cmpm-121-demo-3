// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

// Deterministic random number generator
import luck from "./luck.ts";

// board of grid cells
import Board from "./board.ts";

const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const CACHE_SPAWN_PROBABILITY = 0.1;
const knownCells: Map<string, Cache> = new Map();

//generate board
const board = new Board(10, 10);

// center it on the oaks classroom location
const OAKES_CLASSROOM_CELL: Cell = {i: 369894, j: -1220627};
const cellBounds = board.getCellBounds(OAKES_CLASSROOM_CELL);
const centerLat = (cellBounds.getNorth() + cellBounds.getSouth()) / 2;
const centerLng = (cellBounds.getEast() + cellBounds.getWest()) / 2;

// Create the map (element with id "map" is defined in index.html)
const map = leaflet.map(document.getElementById("map")!,{
  center: [centerLat, centerLng],
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

// Populate the map with a background tile layer
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

// Add a marker to represent the player
const playerMarker = leaflet.marker([centerLat, centerLng]);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

// Display the player's points
let playerPoints = 0;
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!; // element `statusPanel` is defined in index.html
statusPanel.innerHTML = "No points yet...";

// Add caches to the map by cell numbers
interface Cell{
  readonly i: number;
  readonly j: number;
}

interface Cache{
  coins: number;
  cell: Cell;
}

function spawnCache(c: Cache) {
  // Convert cell numbers into lat/lng bounds
  const bounds = leaflet.latLngBounds([
    [
      centerLat + c.cell.i * TILE_DEGREES,
      centerLng + c.cell.j * TILE_DEGREES,
    ],
    [
      centerLat + (c.cell.i + 1) * TILE_DEGREES,
      centerLng + (c.cell.j + 1) * TILE_DEGREES,
    ],
  ]);

  // Add a rectangle to the map to represent the cache
  const rect = leaflet.rectangle(bounds);
  rect.addTo(map);

  // Handle interactions with the cache
  rect.bindPopup(() => {
    // Each cache has a random point value, mutable by the player
    c.coins = Math.floor(
      luck([c.cell.i, c.cell.j, "initialValue"].toString()) * 100,
    );

    // The popup offers a description and button
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `
                <div>There is a cache here at "${c.cell.i},${c.cell.j}". It has value <span id="value">${c.coins}</span>.</div>
                <button id="collect">collect</button>`;

    // Clicking the button decrements the cache's value and increments the player's points
    popupDiv
      .querySelector<HTMLButtonElement>("#collect")!
      .addEventListener("click", () => {
        CollectCoin(c);
        popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML = c.coins
        .toString();
      });

    return popupDiv;
  });
}

function CollectCoin(cache: Cache){
  playerPoints ++;
  cache.coins --;
  statusPanel.innerHTML = `${playerPoints} points accumulated`;
}

for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
  for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
    if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
      const cache = { coins: 0, cell: { i, j } };
      knownCells.set([i, j].toString(), cache);
      spawnCache(cache);
    }
  }
}