/**
 * @typedef  {Object} BaseAnime
 *
 * @property {string}   provider      The provider of this anime
 * @property {string}   url           URL to this anime
 * @property {string}   name          The name of the anime
 * @property {string}   year          The year the anime was released on
 */
/**
 * @typedef  {Object} Anime
 *
 * @property {string}   provider      The provider of this anime
 * @property {string}   url           URL to this anime
 * @property {string}   name          The name of the anime
 * @property {string}   type          If the anime is subbed or dubbed or whatever else
 * @property {string}   year          The year the anime was released on
 * @property {string}   description   A brief description of the anime
 * @property {string[]} genres        The genres that this anime belongs to
 * @property {string}   status        Whether this anime is completed or ongoing
 * @property {string[]} episodes      All the episodes in this anime
 */

class AnimeProvider {
  /**
   * @param {{name: string, watermarked: boolean}}
   * @param {import('../lib')}
   */
  constructor({ name, watermarked = false }, { cli, http, file, util }) {
    this.name = name;
    this.watermarked = watermarked;
    this.cli = cli;
    this.http = http;
    this.file = file;
    this.util = util;
  }
  async init() {
    return true;
  }
  /**
   * Search for and return basic metadata of anime
   * @abstract
   * @param   {string} query The query to search basic anime data for
   * @returns Promise<BaseAnime[]>
   */
  search(query) {
    throw new Error(`${this.name} doesn't have a "search" method...`);
  }
  /**
   * Get more info about an anime using the base metadata
   * @abstract
   * @param   {BaseAnime} baseData The basic metadata of the anime
   * @returns Promise<Anime>
   */
  info(baseData) {
    throw new Error(`${this.name} doesn't have a "info" method...`);
  }
  /**
   * Get the download link of a certain episode in an anime
   * @abstract
   * @param   {Anime}  anime    The anime data of the anime to download
   * @param   {string} episode  The episode to download of that anime
   * @returns Promise<string>
   */
  downloadLink(anime, episode) {
    throw new Error(`${this.name} doesn't have a "downloadLink" method...`);
  }
}

module.exports = AnimeProvider;
