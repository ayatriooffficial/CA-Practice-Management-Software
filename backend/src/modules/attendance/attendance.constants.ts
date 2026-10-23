export const ATTENDANCE_CONSTANTS = {
  DEFAULT_SHIFT_START: '09:30', // 9:30 AM IST
  DEFAULT_SHIFT_END: '18:30',   // 6:30 PM IST (9 hours)
  GRACE_PERIOD_MINUTES: 15,     // 15 min grace => Up to 9:45 AM is On Time
  DEFAULT_WEEK_OFF_DAY: 0,      // 0 = Sunday
  STANDARD_SHIFT_HOURS: 9,

  // Krishna Associates Office Coordinates (Dombivli)
  OFFICE: {
    id: 'off_dombivli_main',
    name: 'Krishna Associates, Dombivli',
    lat: 19.2183,
    lng: 73.0867,
    radiusM: 200,
  },
};

/**
 * Calculates distance between two GPS coordinates in meters using Haversine formula.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}
