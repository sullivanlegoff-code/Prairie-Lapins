// Cuts the beginning of an MPEG-1 Layer III file without re-encoding: keeps whole frames from the first
// one starting at or after <seconds>, drops tags and the Xing/Info frame. Usage:
//   node scripts/trim-mp3.mjs <source.mp3> <seconds> <output.mp3>
import {readFileSync, writeFileSync} from 'node:fs';

const [source, seconds, output] = process.argv.slice(2);
if (!source || !output || !(Number(seconds) >= 0)) throw new Error('Usage: node scripts/trim-mp3.mjs <source.mp3> <seconds> <output.mp3>');
const bytes = readFileSync(source);
const BITRATES = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320], RATES = [44100, 48000, 32000];
let pos = 0;
if (bytes.subarray(0, 3).toString() === 'ID3') pos = 10 + ((bytes[6] & 127) << 21 | (bytes[7] & 127) << 14 | (bytes[8] & 127) << 7 | (bytes[9] & 127));
const frames = [];
while (pos + 4 <= bytes.length) {
  const version = (bytes[pos + 1] >> 3) & 3, layer = (bytes[pos + 1] >> 1) & 3, bitrate = bytes[pos + 2] >> 4, rate = (bytes[pos + 2] >> 2) & 3;
  if (bytes[pos] !== 0xff || (bytes[pos + 1] & 0xe0) !== 0xe0 || version !== 3 || layer !== 1 || !bitrate || bitrate === 15 || rate === 3) {
    if (bytes.subarray(pos, pos + 3).toString() === 'TAG') break;
    if (frames.length) throw new Error(`Unexpected data at byte ${pos}`);
    pos++; continue;
  }
  const length = Math.floor(144 * BITRATES[bitrate] * 1000 / RATES[rate]) + ((bytes[pos + 2] >> 1) & 1);
  frames.push({start: pos, length, rate: RATES[rate]});
  pos += length;
}
const header = bytes.subarray(frames[0].start + 4, frames[0].start + frames[0].length).toString('latin1');
if (/Xing|Info/.test(header)) frames.shift();
const rate = frames[0].rate, skip = Math.ceil(Number(seconds) * rate / 1152 - 1e-9);
const kept = frames.slice(skip);
writeFileSync(output, Buffer.concat(kept.map(f => bytes.subarray(f.start, f.start + f.length))));
console.log(JSON.stringify({startsAt: +(skip * 1152 / rate).toFixed(3), seconds: +(kept.length * 1152 / rate).toFixed(2), frames: kept.length, bytes: kept.reduce((n, f) => n + f.length, 0)}));
