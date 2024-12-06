import leaflet from "leaflet";

export class MapManager {
    map: leaflet.Map;
    constructor(map: leaflet.Map) {
        this.map = map;
    }

    addMarker(lat: number, lng: number, tooltip: string) {
        const marker = leaflet.marker([lat, lng]);
        marker.bindTooltip(tooltip);
        marker.addTo(this.map);
        return marker;
    }

    addPolyline(points: leaflet.LatLng[]) {
        leaflet.polyline(points, { color: "blue" }).addTo(this.map);
    }

    addMapRectangle(
        southLat: number,
        westLng: number,
        northLat: number,
        eastLng: number,
    ) {
        const rect = leaflet.rectangle(
            leaflet.latLngBounds(
                leaflet.latLng(southLat, westLng),
                leaflet.latLng(northLat, eastLng),
            ),
            { color: "blue" },
        ).addTo(this.map);
        return rect;
    }

    removeMapRectangle(rectangle: leaflet.Rectangle) {
        this.map.removeLayer(rectangle);
    }
}
