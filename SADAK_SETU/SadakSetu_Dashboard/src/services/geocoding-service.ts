/**
 * Reverse geocoding service for SadakSetu.
 * Resolves human-readable street addresses, areas, districts, and postal details
 * from GPS coordinates using OpenStreetMap Nominatim with in-memory caching.
 */

export interface ReverseGeocodeResult {
  displayName: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  village?: string;
  city?: string;
  district?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

const cache = new Map<string, ReverseGeocodeResult>();

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult | null> {
  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    isNaN(lat) ||
    isNaN(lng) ||
    (lat === 0 && lng === 0)
  ) {
    return null;
  }

  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  if (cache.has(key)) {
    return cache.get(key)!;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      }
    );
    clearTimeout(timeout);

    if (!response.ok) return null;
    const data = await response.json();
    const addr = data.address || {};

    const result: ReverseGeocodeResult = {
      displayName: data.display_name || "",
      road: addr.road || addr.street || addr.pedestrian || addr.highway,
      neighbourhood: addr.neighbourhood || addr.subdivision,
      suburb: addr.suburb || addr.hamlet,
      village: addr.village || addr.town,
      city: addr.city || addr.municipality,
      district: addr.state_district || addr.county,
      state: addr.state,
      postcode: addr.postcode,
      country: addr.country,
    };

    cache.set(key, result);
    return result;
  } catch {
    return null;
  }
}

/**
 * Checks whether an address string is meaningful rather than empty or raw coordinates.
 */
export function isMeaningfulAddress(address?: string | null): boolean {
  if (!address) return false;
  const trimmed = address.trim();
  if (!trimmed || trimmed.toLowerCase() === "null" || trimmed.toLowerCase() === "undefined") {
    return false;
  }
  // Check if string is purely numeric coordinates like "20.59370, 78.96290"
  if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(trimmed)) {
    return false;
  }
  return true;
}
