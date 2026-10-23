/** Presentation only: the Maison du Chef Lapin artwork. Logical 4 × 4 footprint, hit area and save data unchanged.
 * Source: docs/art-references/cuisine-chef-lapin.png.png, flat backdrop made transparent and cropped, pixels kept. */
export const KITCHEN_ART = {
  texture: 'kitchen-chef-lapin',
  url: import.meta.env.BASE_URL + 'assets/buildings/kitchen-chef-lapin.png',
  width: 768, height: 711,
  // The grass diamond spans the full texture width (x 2–765): drawn 177 wide, it covers the 176-wide footprint.
  // Its side corners (y 492) sit 18 world units below the footprint centre, so the front tip (y 708) lands just inside
  // the footprint's front edge and the roof rises as little as possible above the tappable 4 × 4 area.
  worldWidth: 177, originY: (492 - 18 * 768 / 177) / 711,
  // Label 12 units in front of the projected footprint's front edge (148 × q / 2 ≈ 64), as before the projection.
  labelY: 76,
} as const;
