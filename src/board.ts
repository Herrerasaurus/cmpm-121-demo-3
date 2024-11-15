import leaflet from "leaflet";

interface Cell {
  readonly i: number;
  readonly j: number;
}

export class Board {
  TILE_WIDTH = 10;
  TILE_VISIBILITY_RADIUS = 10;

  private readonly KNOWN_CELLS = new Map<string, Cell>();

  constructor(TILE_WIDTH: number, TILE_VISIBILITY_RADIUS: number) {
    this.TILE_WIDTH = TILE_WIDTH;
    this.TILE_VISIBILITY_RADIUS = TILE_VISIBILITY_RADIUS;
  }

  private getCanonicalCell(cell: Cell): Cell {
    const { i, j } = cell;
    const key = [i, j].toString();
    if (!this.KNOWN_CELLS.has(key)) {
      this.KNOWN_CELLS.set(key, { i, j });
    }
    return this.KNOWN_CELLS.get(key)!;
  }

  getCellForPoint(point: leaflet.LatLng): Cell {
    return this.getCanonicalCell({
      i: Math.floor(point.lat / this.TILE_WIDTH),
      j: Math.floor(point.lng / this.TILE_WIDTH),
    });
  }

  getCellBounds(cell: Cell): leaflet.LatLngBounds {
    const origin = leaflet.latLng(0, 0);
    return leaflet.latLngBounds([
      [
        origin.lat + cell.i * this.TILE_WIDTH,
        origin.lng + cell.j * this.TILE_WIDTH,
      ],
      [
        origin.lat + (cell.i + 1) * this.TILE_WIDTH,
        origin.lng + (cell.j + 1) * this.TILE_WIDTH,
      ],
    ]);
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
