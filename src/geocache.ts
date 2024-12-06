import { Coin, Geocache } from "./main.ts";
// Deterministic random number generator
import luck from "./luck.ts";

type CacheStateMap = Map<string, Geocache>;

function generateCoins(
    cell: { i: number; j: number },
    serialNum: number,
): Coin {
    return {
        location: { i: cell.i, j: cell.j },
        serial: serialNum,
    };
}

class CacheStateManager {
    private cacheStates: CacheStateMap;

    constructor() {
        this.cacheStates = new Map();
    }

    // Get a specific cache by key
    getCache(key: string): Geocache | undefined {
        return this.cacheStates.get(key);
    }

    // Add or update a cache
    addCache(key: string, cache: Geocache): void {
        this.cacheStates.set(key, cache);
    }

    // Check if a cache exists
    hasCache(key: string): boolean {
        return this.cacheStates.has(key);
    }

    initializeCache(i: number, j: number): Geocache {
        const cache = new Geocache(i, j);
        const pointValue = Math.floor(
            luck([i, j, "initialValue"].toString()) * 10,
        );
        cache.numCoins = pointValue;

        for (let x = 0; x < pointValue; x++) {
            cache.coins.push(generateCoins({ i, j }, x));
        }

        return cache;
    }

    resetCaches(): void {
        this.cacheStates.clear();
    }

    getAllCaches(): Map<string, Geocache> {
        return this.cacheStates;
    }
}

export const cacheManager = new CacheStateManager();
