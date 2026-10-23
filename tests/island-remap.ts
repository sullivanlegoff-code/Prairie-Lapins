/**
 * Test-side copy of the v10 → v11 coordinate remap (docs/island-size-plan.md): the tests that still place objects by former strip
 * coordinates convert them to the current fine grid with it.
 * Legacy parcels: 12 fine cells; v11 parcels: 16; offset (+2, +4) inside each parcel.
 */
const OFFSET = {x: 2, y: 4} as const;
export const toV11 = (value: number, axis: 'x' | 'y') => 16 * Math.floor(value / 12) + OFFSET[axis] + value % 12;
