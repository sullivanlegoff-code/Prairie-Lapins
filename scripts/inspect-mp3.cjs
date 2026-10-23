// Read-only MPEG-1 Layer III frame inspection; usage: node scripts/inspect-mp3.cjs <directory>...
const fs = require('node:fs'), path = require('node:path');
for (const directory of process.argv.slice(2)) {
  for (const name of fs.readdirSync(directory).filter(name => name.endsWith('.mp3'))) {
    const bytes = fs.readFileSync(path.join(directory, name));
    let frames = 0, seconds = 0, format;
    for (let offset = 0; offset < bytes.length - 4;) {
      const header = bytes.readUInt32BE(offset);
      const bitrate = [0,32,40,48,56,64,80,96,112,128,160,192,224,256,320][(header >>> 12) & 15];
      const rate = [44100,48000,32000][(header >>> 10) & 3];
      if (header >>> 21 !== 2047 || ((header >>> 19) & 3) !== 3 || ((header >>> 17) & 3) !== 1 || !bitrate || !rate) { offset++; continue; }
      const length = Math.floor(144000 * bitrate / rate) + ((header >>> 9) & 1);
      if (offset + length > bytes.length) break;
      frames++; seconds += 1152 / rate; format ??= {bitrate, rate}; offset += length;
    }
    console.log(JSON.stringify({directory, name, bytes: bytes.length, frames, seconds: Number(seconds.toFixed(3)), ...format}));
  }
}
