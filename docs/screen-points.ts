// Browser checks only: map points as the game draws them, so computed taps stay true under any projection.
// The game projects ground points (src/ui/gestures) through src/ui/projection; these are the projected ones.
import {buildingCenter as groundBuildingCenter, finePoint as groundFinePoint, gridPoint as groundGridPoint, type Point} from '../src/ui/gestures';
import {toScreen} from '../src/ui/projection';
export {groundBuildingCenter, groundFinePoint, groundGridPoint};
export {toGround, toScreen, screenBounds} from '../src/ui/projection';
export {ownedRegions} from '../src/display/recenter';
/** Screen-world point of a logical cell corner (projected gridPoint). */
export const gridPoint = (x: number, y: number): Point => toScreen(groundGridPoint(x, y));
/** Screen-world point of a fine-grid corner (projected finePoint). */
export const finePoint = (x: number, y: number): Point => toScreen(groundFinePoint(x, y));
/** Screen-world anchor of a building, where its upright art and label are placed (projected buildingCenter). */
export const buildingCenter = (b: Point): Point => toScreen(groundBuildingCenter(b));
