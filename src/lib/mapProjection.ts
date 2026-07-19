// Simple equirectangular projection calibrated to the Africa basemap's viewBox.
// The basemap (AfricaMap.astro) is drawn against this exact bounding box, so any
// lat/lng within continental Africa lands in the right relative position.

export const MAP_VIEWBOX = { width: 800, height: 850 };

const BOUNDS = {
  west: -20,
  east: 52,
  north: 38,
  south: -35,
};

export function project(lat: number, lng: number): { x: number; y: number } {
  const x =
    ((lng - BOUNDS.west) / (BOUNDS.east - BOUNDS.west)) * MAP_VIEWBOX.width;
  const y =
    ((BOUNDS.north - lat) / (BOUNDS.north - BOUNDS.south)) *
    MAP_VIEWBOX.height;
  return { x, y };
}
