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
class GogoAnime extends AnimeProvider {
  constructor(base) {
    super({ name: "gogoanime", watermarked: false }, base);
    this.cookie = null;
  }
  async init() {
    const res = await this.http.get(`https://www1.gogoanime.ai/`);
    this.cookie = this.http.parseCookies(res.headers["set-cookie"]);
  }
  async search(query) {
    const res = await this.http.get(
      `https://www1.gogoanime.ai//search.html?${querystring
        .stringify({ keyword: query })
        .replace("%20", "+")}`,
      { cookie: this.http.toCookieString(this.cookie) }
    );
    let animes = [];
    const $ = cheerio.load(res.data);
    Array.from($(".items")[0].children).forEach((value, index) => {
      animes.push({
        provider: "gogoanime",
        link:
          "https://www1.gogoanime.ai" +
          $(
            `.items > li:nth-child(${
              index + 1
            }) > div:nth-child(1) > a:nth-child(1)`
          ).attr("href"),
        name: $(
          `.items > li:nth-child(${
            index + 1
          }) > p:nth-child(2) > a:nth-child(1)`
        )
          .text()
          ?.trim(),
        year: $(`.items > li:nth-child(${index + 1}) > p:nth-child(3)`)
          .text()
          .split(":")[1]
          ?.trim(),
      });
    });
    animes = animes.filter((a) => a.name != "");
    return animes;
  }
  async info(baseData) {
    const res = await this.http.get(baseData.link);
    const $ = cheerio.load(res.data);
    const episodeDataQuery = {
      ep_start: $(".active").attr("ep_start"),
      ep_end: $(".active").attr("ep_end"),
      id: $("#movie_id").val(),
      default_ep: $("#default_ep").val(),
      alias: $("#alias_anime").val(),
    };
    const e = cheerio.load(
      (
        await this.http.get(
          `https://ajax.gogo-load.com/ajax/load-list-episode?${querystring.stringify(
            episodeDataQuery
          )}`
        )
      ).data
    );
    let episodes = [];
    Array.from(e("#episode_related").children()).map((value, index) => {
      episodes.push(
        e(
          `#episode_related > li:nth-child(${
            index + 1
          }) > a:nth-child(1) > div:nth-child(1)`
        )
          .text()
          .replace("EP ", "")
      );
    });
    episodes = episodes.sort((a, b) => parseInt(a) - parseInt(b));
    const data = {
      ...baseData,
      extras: {
        alias: episodeDataQuery.alias,
      },
      description: $("p.type:nth-child(5)")
        .text()
        .split(":")
        .slice(-1)
        .join(":")
        .trim(),
      status: $("p.type:nth-child(8) > a:nth-child(2)").text(),
      genres: Array.from($("p.type:nth-child(6)").children())
        .map((c) =>
          c.tagName !== "span"
            ? c.children[0].data.replace(",", "").trim()
            : false
        )
        .filter((e) => !!e),
      episodes,
      type: baseData.name.includes("Dub") ? "Dubbed" : "Subbed",
    };
    return data;
  }
  async downloadLink(anime, episode) {
    let $ = cheerio.load(
      (
        await this.http.get(
          `https://www1.gogoanime.ai/${anime.extras.alias}-episode-${episode}`
        )
      ).data
    );
    $ = cheerio.load(
      (await this.http.get($(".dowloads > a:nth-child(1)").attr("href"))).data
    );
    let result = {};
    Array.from($(".dowload"))
      .map((v) => v.children[0])
      .forEach((v) => {
        const qualityRegexRes = v.children[0].data.match(/\((.*) - mp4\)/);
        if (qualityRegexRes) result[qualityRegexRes[1]] = v.attribs.href;
      });
    return result;
    return $(
      "div.mirror_link:nth-child(5) > div:nth-child(3) > a:nth-child(1)"
    ).attr("href");
  }
}

module.exports = GogoAnime;
