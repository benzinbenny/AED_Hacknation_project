import type { AedRecord } from "./types";

export type DuplicateCandidate = {
  recordIds: [string, string];
  distanceMeters: number;
  decisionRequired: true;
  independentSources: number;
};

type Coordinate = AedRecord["location"];

function distanceMeters(first: Coordinate, second: Coordinate): number {
  const earthRadiusMeters = 6_371_000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const lat1 = toRadians(first.latitude);
  const lat2 = toRadians(second.latitude);
  const deltaLat = lat2 - lat1;
  const deltaLon = toRadians(second.longitude - first.longitude);
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(a));
}

function independentSourceCount(records: AedRecord[]): number {
  const origins = new Set<string>();
  for (const record of records) {
    for (const source of record.sources) {
      origins.add((source.upstreamOrigin ?? source.sourceId).trim().toLowerCase());
    }
  }
  return origins.size;
}

export function findDuplicateCandidates(records: AedRecord[], thresholdMeters: number): DuplicateCandidate[] {
  if (records.length < 2 || thresholdMeters < 0) return [];

  const candidates: DuplicateCandidate[] = [];
  const locations = records.map((record) => record.location);
  const latitudeCell = Math.max(thresholdMeters, 0.1) / 111_000;
  const polarCutoff = 84.26 - latitudeCell;
  const longitudeCellFloor = Math.min(360, latitudeCell / 0.1);
  const longitudeCellCount = Math.max(1, Math.floor(360 / longitudeCellFloor));
  const longitudeCell = 360 / longitudeCellCount;
  const latitudeBuckets = new Map<string, number[]>();
  const grid = new Map<string, number[]>();

  function append(bucket: Map<string, number[]>, key: string, index: number) {
    const current = bucket.get(key);
    if (current) current.push(index);
    else bucket.set(key, [index]);
  }

  for (let secondIndex = 0; secondIndex < records.length; secondIndex += 1) {
    const second = records[secondIndex];
    const coordinate = locations[secondIndex];
    const latitudeIndex = Math.floor((coordinate.latitude + 90) / latitudeCell);
    const longitudeNormalized = ((coordinate.longitude % 360) + 360) % 360;
    const longitudeIndex = Math.min(longitudeCellCount - 1, Math.floor(longitudeNormalized / longitudeCell));
    const nearPole = Math.abs(coordinate.latitude) >= polarCutoff;
    const nearbyIndices = new Set<number>();

    if (nearPole) {
      for (let row = latitudeIndex - 1; row <= latitudeIndex + 1; row += 1) {
        for (const index of latitudeBuckets.get(String(row)) ?? []) nearbyIndices.add(index);
      }
    } else {
      for (let row = latitudeIndex - 1; row <= latitudeIndex + 1; row += 1) {
        for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
          const column = (longitudeIndex + columnOffset + longitudeCellCount) % longitudeCellCount;
          for (const index of grid.get(`${row}:${column}`) ?? []) nearbyIndices.add(index);
        }
      }
    }

    for (const firstIndex of Array.from(nearbyIndices).sort((a, b) => a - b)) {
      const first = records[firstIndex];
      if (first.id === second.id) continue;
      const distance = distanceMeters(locations[firstIndex], coordinate);
      if (distance <= thresholdMeters) {
        candidates.push({
          recordIds: [first.id, second.id],
          distanceMeters: Math.round(distance * 10) / 10,
          decisionRequired: true,
          independentSources: independentSourceCount([first, second]),
        });
      }
    }

    append(latitudeBuckets, String(latitudeIndex), secondIndex);
    if (!nearPole) append(grid, `${latitudeIndex}:${longitudeIndex}`, secondIndex);
  }
  return candidates;
}
