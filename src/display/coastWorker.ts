import {renderCoast} from './coastRasterJob';
import type {CoastRequest, CoastResponse} from './coastProtocol';

const scope = globalThis as unknown as {
  onmessage: (event: MessageEvent<CoastRequest>) => void;
  postMessage(message: CoastResponse, transfer?: ArrayBuffer[]): void;
};
scope.onmessage = ({data}) => {
  if (data.type !== 'generate') return;
  try {
    const result = renderCoast(data);
    scope.postMessage(result, result.tiles.map(tile => tile.buffer));
  } catch (error) {
    scope.postMessage({type: 'failure', id: data.id, message: String(error)});
  }
};
scope.postMessage({type: 'ready'});
