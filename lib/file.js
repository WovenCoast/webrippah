const fs = require('fs');
const path = require('path');
const util = require('./util');

const extendedInfoCache = new Map();

module.exports = {
  getCurrentDirectoryBase() {
    return path.basename(process.cwd())
  },
  getCurrentDirectory() {
    return process.cwd();
  },
  resolvePath(...args) {
    return path.resolve(...args);
  },
  extension(path) {
    const p = path.split('.');
    return '.' + p[p.length-1];
  },
  fileNameForEpisode(ep, ext) {
    if (ep.length == 1) ep = "00" + ep;
    if (ep.length == 2) ep = "0" + ep;
    return ep + ext;
  },
  animeNameFromDirectory(dir) {
    if (path.basename(dir).toLowerCase().includes("season")) {
      return this.animeNameFromDirectory(path.dirname(dir));
    } else return path.basename(dir);
  },
  allFiles(dir) {
    return fs.readdirSync(dir, { withFileTypes: false });
  },
  writeManifest(manifest) {
    return fs.writeFileSync(path.join(process.cwd(), '.manifest.json'), JSON.stringify(manifest, null, 2));
  },
  extendedInfo(file) {
    try {
      if (extendedInfoCache.has(path.join(process.cwd(), file))) return extendedInfoCache.get(path.join(process.cwd(), file));
      const stats = fs.statSync(path.join(process.cwd(), file));
      extendedInfoCache.set(path.join(process.cwd(), file), stats);
      return stats;
    } catch (e) {
      return undefined;
    }
  },
  writeFile(file, data) {
    return fs.writeFileSync(path.join(process.cwd(), file), data);
  },
  readFile(file) {
    return fs.readFileSync(path.join(process.cwd(), file), { encoding: 'utf-8' });
  },
  deleteFile(file) {
    return fs.unlinkSync(path.join(process.cwd(), file));
  },
  fileExists(filepath) {
    return fs.existsSync(filepath);
  }
}