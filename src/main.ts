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

//generate board
const board = new Board(TILE_DEGREES, NEIGHBORHOOD_SIZE);

// center it on the oaks classroom location
const OAKES_LAT = 369894 * TILE_DEGREES;
const OAKES_LNG = -1220627 * TILE_DEGREES;
const OAKES_CLASSROOM = new leaflet.LatLng(OAKES_LAT, OAKES_LNG);

// Create the map (element with id "map" is defined in index.html)
const map = leaflet.map(document.getElementById("map")!, {
  center: OAKES_CLASSROOM,
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
const playerMarker = leaflet.marker(OAKES_CLASSROOM);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);
console.log(OAKES_CLASSROOM);
const playerCoins: Coin[] = [];

// Display the player's points
let playerPoints = 0;
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!; // element `statusPanel` is defined in index.html
statusPanel.innerHTML = "No points yet...";

// Convert the classroom location to a grid cell
const classroomCell = board.getCellForPoint(OAKES_CLASSROOM);
const bounds = board.getCellBounds(classroomCell);

// Add a rectangle to the map to represent the cache
const rect = leaflet.rectangle(bounds);
rect.addTo(map);

// get cells near oaks
const neighborhood = board.getCellsNearPoint(OAKES_CLASSROOM);

// for each cell in the neighborhood, spawn a cache
for (const cell of neighborhood) {
  //randomly spawn cache
  if (luck([cell.i, cell.j].toString()) < CACHE_SPAWN_PROBABILITY) {
    spawnCache(cell.i, cell.j);
  }
}

// Spawn a cache at a given cell
function spawnCache(i: number, j: number) {
  const cell = board.getCellForPoint(
    new leaflet.LatLng(i * TILE_DEGREES, j * TILE_DEGREES),
  );
  const bounds = board.getCellBounds(cell);
  // Add a rectangle to the map to represent the cache
  const rect = leaflet.rectangle(bounds);
  rect.addTo(map);

  // Handle interactions with the cache
  rect.bindPopup(() => {
    // Each cache has a random point value, mutable by the player
    const coinArray: Coin[] = [];
    let pointValue = Math.floor(
      luck([i, j, "initialValue"].toString()) * 100,
    );
    for (let i = 0; i < pointValue; i++) {
      coinArray.push(generateCoins(cell, i));
    }

    // The popup offers a description and button
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `
                <div>There is a cache here at "${cell.i}, ${cell.j}". It has value <span id="value">${pointValue}</span>.</div>
                <button id="collect">collect</button> <button id="deposit">deposit</button>`;

    // Clicking the button decrements the cache's value and increments the player's points
    popupDiv
      .querySelector<HTMLButtonElement>("#collect")!
      .addEventListener("click", () => {
        CollectCoin(coinArray);
        pointValue--;
        popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML =
          pointValue.toString();
      });

    popupDiv
      .querySelector<HTMLButtonElement>("#deposit")!
      .addEventListener("click", () => {
        DepositCoin(coinArray);
        pointValue++;
        popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML =
          pointValue.toString();
      });

    return popupDiv;
  });
}

function CollectCoin(coinArray: Coin[]) {
  playerPoints++;
  playerCoins.push(coinArray.pop()!);
  statusPanel.innerHTML = `${playerPoints} points accumulated`;
}
function DepositCoin(coinArray: Coin[]) {
  playerPoints--;
  coinArray.push(playerCoins.pop()!);
  statusPanel.innerHTML = `${playerPoints} points accumulated`;
}

// adding serial number identification to each coin
interface Coin {
  location: { i: number; j: number };
  serial: number;
}

function generateCoins(location: {i: number, j: number}, serialNum: number): Coin {
  return {
    location: { i: location.i, j: location.j },
    serial: serialNum,
  };
}
