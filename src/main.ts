// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

// Deterministic random number generator
import luck from "./luck.ts";

// Board of grid cells
import Board from "./board.ts";

const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const CACHE_SPAWN_PROBABILITY = 0.1;

// Generate board
const board = new Board(TILE_DEGREES, NEIGHBORHOOD_SIZE);

// Center it on the oaks classroom location
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

// Save game state with persistent data storage
interface GameData {
  playerPosition: leaflet.LatLng;
  playerPoints: number;
  playerCoins: Coin[];
  cacheStates: Record<string, string>;
  playerMovementHistory: leaflet.LatLng[];
}

function saveGame() {
  const cacheStateData: Record<string, string> = {};
  for (const [key, cache] of cacheStates.entries()) {
    cacheStateData[key] = cache.toMomento(); // Serialize each cache
  }

  const gameData: GameData = {
    playerPosition: new leaflet.LatLng(playerPosition.lat, playerPosition.lng),
    playerPoints,
    playerCoins,
    cacheStates: cacheStateData,
    playerMovementHistory,
  };

  localStorage.setItem("gameState", JSON.stringify(gameData));
  console.log("Game state saved.");
}

function loadGame() {
  const savedState = localStorage.getItem("gameState");
  if (!savedState) {
    console.log("No saved game state found.");
    return;
  }

  const gameData: GameData = JSON.parse(savedState);

  // Restore cache states
  for (const key in gameData.cacheStates) {
    if (Object.prototype.hasOwnProperty.call(gameData.cacheStates, key)) {
      const cacheState = gameData.cacheStates[key];
      const cache = new Geocache(0, 0);
      cache.fromMomento(cacheState);
      cacheStates.set(key, cache);
    }
  }

  // Restore player position
  playerPosition = new leaflet.LatLng(
    gameData.playerPosition.lat,
    gameData.playerPosition.lng,
  );
  playerMarker.setLatLng(playerPosition);
  map.panTo(playerPosition);

  // Restore player movement history
  playerMovementHistory.length = 0;
  playerMovementHistory.push(...gameData.playerMovementHistory);
  const _playerPolyline = leaflet.polyline(playerMovementHistory, {
    color: "blue",
  }).addTo(map);
  console.log(playerMovementHistory);

  // Restore player points and coins
  playerPoints = gameData.playerPoints;
  playerCoins.length = 0;
  playerCoins.push(...gameData.playerCoins);
  statusPanel.innerHTML = `${playerPoints} points accumulated`;
  inventoryPanel.innerHTML = printCoins(playerCoins);

  console.log("Game state loaded.");
}

globalThis.addEventListener("beforeunload", saveGame);

globalThis.addEventListener("load", () => {
  loadGame();
  regenerateNeighborhood();
});

// Reset game state
function resetGame() {
  const confirmReset = confirm("Are you sure you want to reset the game?");
  if (!confirmReset) {
    return;
  }

  // Clear local storage
  localStorage.removeItem("gameState");
  //location.reload();

  // Reset in-memory state
  playerPosition = OAKES_CLASSROOM;
  playerMarker.setLatLng(playerPosition);
  map.panTo(playerPosition);

  playerPoints = 0;
  playerCoins.length = 0;
  cacheStates.clear();
  playerMovementHistory.length = 0;

  // Reset UI
  statusPanel.innerHTML = "No points yet...";
  inventoryPanel.innerHTML = " ";
  map.eachLayer((layer) => {
    if (layer instanceof leaflet.Polyline) {
      map.removeLayer(layer);
    }
  });
  regenerateNeighborhood();

  console.log("Game state reset.");
}

document.getElementById("reset")!.addEventListener("click", () => {
  resetGame();
});

// Player movement history
const playerMovementHistory: leaflet.LatLng[] = [];

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

// Keep track of player's position
let playerPosition = OAKES_CLASSROOM;

function updatePlayerPosition(latDelta: number, lngDelta: number) {
  playerPosition = new leaflet.LatLng(
    playerPosition.lat + latDelta,
    playerPosition.lng + lngDelta,
  );

  // Move player marker and update map view
  playerMarker.setLatLng(playerPosition);
  map.panTo(playerPosition);

  // Update player movement history
  playerMovementHistory.push(playerPosition);
  const _polyline = leaflet.polyline(playerMovementHistory, { color: "blue" })
    .addTo(map);
  regenerateNeighborhood();
}

// Keep track of players geolocation
let trackGeolocation: number | null = null;
const geolocationButton = document.getElementById("sensor")!;

function updateGeolocationPosition(lat: number, lng: number) {
  const latDelta = lat - playerPosition.lat;
  const lngDelta = lng - playerPosition.lng;
  updatePlayerPosition(latDelta, lngDelta);
  map.panTo(playerPosition);
}

function geolocationTracking() {
  trackGeolocation = navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      updateGeolocationPosition(latitude, longitude);
    },
    (error) => {
      console.error("Error watching geolocation:", error);
      alert("Please check your permissions");
    },
    {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 5000,
    },
  );
}

geolocationButton.addEventListener("click", () => {
  if (trackGeolocation === null) {
    geolocationTracking();
  }
});

// Display the player's points
let playerPoints = 0;
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!; // element `statusPanel` is defined in index.html
statusPanel.innerHTML = "No points yet...";

// Display the player's inventory
const inventoryPanel = document.querySelector<HTMLDivElement>(
  "#inventoryPanel",
)!;
inventoryPanel.innerHTML = " ";

// Convert the classroom location to a grid cell
const classroomCell = board.getCellForPoint(OAKES_CLASSROOM);
const bounds = board.getCellBounds(classroomCell);

// Add a rectangle to the map to represent the cache
const rect = leaflet.rectangle(bounds);
rect.addTo(map);

// Apply momento pattern to save the state of the caches
interface Momento<T> {
  toMomento(): T;
  fromMomento(momento: T): void;
}

class Geocache implements Momento<string> {
  location: { i: number; j: number };
  numCoins: number;
  coins: Coin[];

  constructor(i: number, j: number) {
    this.location = { i: i, j: j };
    this.numCoins = 0;
    this.coins = [];
  }

  toMomento(): string {
    return JSON.stringify({
      numCoins: this.numCoins,
      coins: this.coins,
    });
  }

  fromMomento(momento: string): void {
    const state = JSON.parse(momento);
    this.numCoins = state.numCoins;
    this.coins = state.coins;
  }
}

const cacheStates = new Map<string, Geocache>();

// Regenerate neightborhood when player moves
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
regenerateNeighborhood();

// Spawn a cache at a given cell
function spawnCache(i: number, j: number) {
  const cell = board.getCellForPoint(
    new leaflet.LatLng(i * TILE_DEGREES, j * TILE_DEGREES),
  );
  const bounds = board.getCellBounds(cell);
  // Add a rectangle to the map to represent the cache
  const rect = leaflet.rectangle(bounds);
  rect.addTo(map);
  const pointValue = Math.floor(
    luck([i, j, "initialValue"].toString()) * 10,
  );

  // Check if cache is in cacheStates, if not add it
  const key = `${i}:${j}`;
  let cache: Geocache | null = null;
  if (!cacheStates.has(key)) {
    cacheStates.set(key, new Geocache(i, j));
    // Set cache coin value
    cache = cacheStates.get(key) ?? null;
    if (cache) {
      cache.numCoins = pointValue;
      for (let x = 0; x < pointValue; x++) {
        cache.coins.push(generateCoins(cell, x));
      }
    }
  } else {
    cache = cacheStates.get(key) ?? null;
    if (cache) {
      const momento = cache.toMomento();
      cache.fromMomento(momento);
    }
  }

  function createPopupContent() {
    const coinList = printCoins(cache?.coins ?? []);
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
        if (cache && cache.coins.length > 0) {
          cache.coins = CollectCoin(cache.coins);
          rect.setPopupContent(createPopupContent());
          const playerCoinList = printCoins(playerCoins);
          inventoryPanel.innerHTML = playerCoinList;
        }
      });
    popupDiv
      .querySelector<HTMLButtonElement>("#deposit")!
      .addEventListener("click", () => {
        if (cache && playerCoins.length > 0) {
          cache.coins = DepositCoin(cache.coins);
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

// Adding serial number identification to each coin
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

// Add event listeners for player movement
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
