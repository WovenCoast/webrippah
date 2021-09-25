const axios = require('axios').default;
const fs = require('fs');
const path = require('path');
const Throttle = require('throttle');
const file = require('./file');

module.exports = {
  async get(url, headers) {
    const res = await axios.get(url, {
      headers,
      // headers: Object.assign({
      //   "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:87.0) Gecko/20100101 Firefox/87.0",
      //   "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      //   "Accept-Language": "en-US,en;q=0.5",
      //   "Accept-Encoding": "gzip, deflate, br",
      //   "Connection": "keep-alive",
      //   "Upgrade-Insecure-Requests": "1",
      //   "Cache-Control": "max-age=0",
      //   TE: "Trailers",
      // }, headers)
    }).catch((e) => {
      console.log(e)
    });
    if (!res || res.status !== 200) throw new Error(`Request to "${url}" failed`);
    return res;
  },
  parseCookies(cookieHeader) {
    const cookie = {};
    if (cookieHeader instanceof Array) {
      cookieHeader.forEach(string => {
        string.split(";").forEach(cstring => {
          const csplit = cstring.trim().split("=");
          cookie[csplit[0]] = csplit[1] || true;
        });
      });
    } else {
      cookieHeader.split(";").forEach(cstring => {
        const csplit = cstring.trim().split("=");
        cookie[csplit[0]] = csplit[1] || true;
      });
    }
    return cookie;
  },
  toCookieString(object) {
    let string = "";
    Object.keys(object).forEach(key => {
      if (object[key] === true) string += `${key}; `
      else string += `${key}=${object[key]}; `
    });
    return string.trim();
  },
  async downloadFile(fileUrl, destinationName, ratelimit) {
    const res = await axios({
      method: "GET",
      url: fileUrl,
      responseType: "stream"
    });
    return res.data.pipe(new Throttle(ratelimit)).pipe(fs.createWriteStream(path.join(process.cwd(), destinationName)));
  },
  async resumeFile(fileUrl, destinationName, ratelimit) {
    const fileInfo = file.extendedInfo(destinationName);
    if (!fileInfo) return this.downloadFile(fileUrl, destinationName);
    const res = await axios({
      method: "GET",
      url: fileUrl,
      responseType: "stream",
      headers: {
        'Range': `bytes=${parseInt(fileInfo.size)}-`
      }
    });
    return res.data.pipe(new Throttle(ratelimit)).pipe(fs.createWriteStream(path.join(process.cwd(), destinationName), { flags: "r+", start: fileInfo.size }));
  },
  async info(fileUrl) {
    try {
      return await axios.head(fileUrl);
    } catch (e) {
      throw e;
    }
  }
}