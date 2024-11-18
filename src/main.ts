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

//display the player's inventory
const inventoryPanel = document.querySelector<HTMLDivElement>(
  "#inventoryPanel",
)!; // element `inventoryPanel` is defined in index.html
inventoryPanel.innerHTML = " ";

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

//regenerate neightborhood when player moves
function regenerateNeighborhood() {
  // Remove all caches from the map
  map.eachLayer((layer) => {
    if (layer instanceof leaflet.Rectangle) {
      map.removeLayer(layer);
    }
  });
  const neighborhood = board.getCellsNearPoint(playerPosition);
  for (const cell of neighborhood) {
    if (luck([cell.i, cell.j].toString()) < CACHE_SPAWN_PROBABILITY) {
      spawnCache(cell.i, cell.j);
    }
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

  let coinArray: Coin[] = [];
  let pointValue = Math.floor(
    luck([i, j, "initialValue"].toString()) * 10,
  );
  for (let x = 0; x < pointValue; x++) {
    coinArray.push(generateCoins(cell, x));
  }

  function createPopupContent() {
    const coinList = printCoins(coinArray);
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `
      <div>Cache ${i}:${j}</div>
      Inventory:</div>
      <div id="inventory">${coinList}</div>
      <div>
          <button id="collect">Collect</button>
          <button id="deposit">Deposit</button>
      </div>
    `;
    popupDiv
      .querySelector<HTMLButtonElement>("#collect")!
      .addEventListener("click", () => {
        if (coinArray.length > 0) {
          coinArray = CollectCoin(coinArray);
          pointValue--;
          rect.setPopupContent(createPopupContent());
          const playerCoinList = printCoins(playerCoins);
          inventoryPanel.innerHTML = playerCoinList;
        }
      });
    popupDiv
      .querySelector<HTMLButtonElement>("#deposit")!
      .addEventListener("click", () => {
        if (playerCoins.length > 0) {
          coinArray = DepositCoin(coinArray);
          pointValue++;
          rect.setPopupContent(createPopupContent());
          const playerCoinList = printCoins(playerCoins);
          inventoryPanel.innerHTML = playerCoinList;
        }
      });
    return popupDiv;
  }
  rect.bindPopup(createPopupContent());
}

function printCoins(array: Coin[]) {
  let coinList = ``;
  for (let i = 0; i < array.length; i++) {
    coinList += `<div>•${array[i].location.i}:${array[i].location.j}#${
      array[i].serial
    }<div>`;
  }
  return coinList;
}

function CollectCoin(coinArray: Coin[]) {
  playerPoints++;
  playerCoins.push(coinArray.shift()!);
  statusPanel.innerHTML = `${playerPoints} points accumulated`;
  return coinArray;
}
function DepositCoin(coinArray: Coin[]) {
  playerPoints--;
  coinArray.push(playerCoins.shift()!);
  statusPanel.innerHTML = `${playerPoints} points accumulated`;
  return coinArray;
}

// adding serial number identification to each coin
interface Coin {
  location: { i: number; j: number };
  serial: number;
}

function generateCoins(
  cell: { i: number; j: number },
  serialNum: number,
): Coin {
  return {
    location: { i: cell.i, j: cell.j },
    serial: serialNum,
  };
}

//player movement
let playerPosition = OAKES_CLASSROOM;

function updatePlayerPosition(latDelta :number, lngDelta: number){
  playerPosition = new leaflet.LatLng(
    playerPosition.lat + latDelta,
    playerPosition.lng + lngDelta,
  );
  playerMarker.setLatLng(playerPosition);
  map.panTo(playerPosition);
  regenerateNeighborhood();
}

//add event listeners for player movement
document.getElementById("north")!.addEventListener("click", () => {
  updatePlayerPosition(TILE_DEGREES, 0);
});
document.getElementById("south")!.addEventListener("click", () => {
  updatePlayerPosition(-TILE_DEGREES, 0);
});
document.getElementById("east")!.addEventListener("click", () => {
  updatePlayerPosition(0, TILE_DEGREES);
});
document.getElementById("west")!.addEventListener("click", () => {
  updatePlayerPosition(0, -TILE_DEGREES);
});

