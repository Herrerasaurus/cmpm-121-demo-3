import leaflet from "leaflet";
import luck from "./luck.ts";

interface Cell {
  readonly i: number;
  readonly j: number;
  coins: Coin[];
}

interface Coin {
    readonly serial: string;
}

export class Board {
  readonly TILE_WIDTH: number;
  readonly TILE_VISIBILITY_RADIUS: number;

  private readonly KNOWN_CELLS: Map<string, Cell>;
  private COIN_SERIAL: number;

  constructor(TILE_WIDTH: number, TILE_VISIBILITY_RADIUS: number) {
    this.TILE_WIDTH = TILE_WIDTH;
    this.TILE_VISIBILITY_RADIUS = TILE_VISIBILITY_RADIUS;
    this.KNOWN_CELLS = new Map<string, Cell>();
    this.COIN_SERIAL = 0;
  }

  private getCanonicalCell(cell: Omit<Cell, "coins">): Cell {
    const { i, j } = cell;
    const key = [i, j].toString();
    if (!this.KNOWN_CELLS.has(key)) {
      // Each cache has a random point value, mutable by the player
      const numCoins = Math.floor(
        luck([ i, j, "initialValue"].toString()) * 100,
      );
      const coins: Coin[] = Array.from({ length: numCoins }, () => ({
        serial: this.generateCoinSerial(i,j),
      }));

      this.KNOWN_CELLS.set(key, { i, j, coins });
    }
    return this.KNOWN_CELLS.get(key)!;
  }

  private generateCoinSerial(i: number, j: number): string {
    const serial = '#${this.c=COIN_SERIAL}';
    this.COIN_SERIAL++;
    return serial;
  }

  getCellForPoint(point: leaflet.LatLng): Cell {
    return this.getCanonicalCell({
      i: Math.floor(point.lat / this.TILE_WIDTH),
      j: Math.floor(point.lng / this.TILE_WIDTH),
    });
  }

  getCellBounds(cell: Cell): leaflet.LatLngBounds {
    const { i, j } = cell;
    //calculate the bounds of the cell
    const southLat = i * this.TILE_WIDTH;
    const westLng = j * this.TILE_WIDTH;
    const northLat = (i + 1) * this.TILE_WIDTH;
    const eastLng = (j + 1) * this.TILE_WIDTH;

    return leaflet.latLngBounds(
      leaflet.latLng(southLat, westLng),
      leaflet.latLng(northLat, eastLng),
    );
  }

  getCellsNearPoint(point: leaflet.LatLng): Cell[] {
    const resultCells: Cell[] = [];
    const originCell = this.getCellForPoint(point);
    for (
      let i = -this.TILE_VISIBILITY_RADIUS;
      i < this.TILE_VISIBILITY_RADIUS;
      i++
    ) {
      for (
        let j = -this.TILE_VISIBILITY_RADIUS;
        j < this.TILE_VISIBILITY_RADIUS;
        j++
      ) {
        const cell = this.getCanonicalCell({
          i: originCell.i + i,
          j: originCell.j + j,
        });
        resultCells.push(cell);
      }
    }
    return resultCells;
  }
}

export default Board;
