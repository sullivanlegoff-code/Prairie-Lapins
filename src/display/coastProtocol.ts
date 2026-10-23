import type {ParcelId} from '../config/land';
import type {TerrainEdges} from './coastRaster';

export interface CoastRequest {type: 'generate'; id: number; ids: ParcelId[]}
export interface CoastTile {
  bounds: {left: number; right: number; top: number; bottom: number};
  width: number; height: number; buffer: ArrayBuffer;
}
export interface CoastResult {
  type: 'result'; id: number; data: TerrainEdges; tiles: CoastTile[];
  stats: {preparationMs: number; pixelMs: number; workerMs: number; rgbaBytes: number; scratchBytes: number};
}
export type CoastResponse = CoastResult | {type: 'ready'} | {type: 'failure'; id: number; message: string};
