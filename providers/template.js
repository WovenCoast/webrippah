/**
 * @type {import('../structures').AnimeProvider}
 */
const { AnimeProvider } = require("../structures");
const cheerio = require("cheerio");
const querystring = require("querystring");

/**
 * @class
 * @augments AnimeProvider
 */
class Anime extends AnimeProvider {
  constructor(base) {
    super({ name: "", watermarked: true }, base);
  }
  async search(query) {}
  async info(baseData) {}
  async downloadLink(anime, episode) {}
}

module.exports = Anime;
