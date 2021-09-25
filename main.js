const { GogoAnime, Hi10Anime } = require("./providers");

const lib = require("./lib");
const { cli, util, file, http } = lib;
util.interval._init(error);

/**
 * @type {Object}
 * @property {import('./structures').AnimeProvider} *
 */
const providers = {
  gogoanime: new GogoAnime(lib),
};

/**
 * @typedef {Object} Config
 */
/**
 * @type {Config}
 */
let config = null;
/**
 * @typedef {Object} Manifest
 * @property {string}   url                   The link for this anime
 * @property {string}   thumbnail             The thumbnail for this anime
 * @property {string}   name                  The name of the anime
 * @property {string}   description           A small and brief description of the anime
 * @property {string}   year                  The year of the first release
 * @property {string}   status                Whether the anime is completed or ongoing
 * @property {string}   watermarked           Whether the anime is watermarked or not
 * @property {string[]} genres                The genres that the anime fits into
 * @property {string[]} episodes              The total episodes in the anime
 * @property {string[]} downloadedEpisodes    The episodes of this anime that have been fully downloaded
 * @property {string}   currentlyDownloading  The episode that it is currently downloading
 * @property {Object}   extras                Any extra data stored in by the provider
 * @property {string}   elapsedTime           Cached elapsed time for previous download
 */
/**
 * @type {Manifest}
 */
let manifest = null;
/**
 * @type {boolean}
 */
let shouldHalt = false;
setInterval(() => {
  if (shouldHalt) process.exit(0);
}, 5);
/**
 * @type {number}
 */
let errors = 0;
setInterval(() => {
  if (errors > 0) errors -= 1;
}, 30000);
async function error(e) {
  util.interval.clearAll();
  errors += 1;
  cli.stopSpinner();
  cli.error(e);
  cli.disableConsole();
  const chalk = require("chalk");
  if (["Request failed", "Speed too slow"].some((v) => e.message.includes(v))) {
    // await cli.hookSpinnerToPromise(util.delay(15), 'Waiting for 15 seconds...');
    process.stdout.write(`${chalk.cyan("!")} Waiting for 15 seconds...`);
  }
  if (errors >= 5) {
    process.stdout.write(
      `${chalk.cyan("!")} Error threshold reached, exiting...`
    );
    shouldHalt = true;
  } else {
    process.stdout.write(`${chalk.cyan("!")} Restarting...`);
    cli.enableConsole();
    return main();
  }
}

async function findAnime(query) {
  const list = [];

  await Promise.all(
    Object.values(providers).map(
      /**
       * @type {import('./structures').AnimeProvider}
       */
      async (provider) => {
        const results = await provider.search(query);
        results.forEach((r) => list.push(r));
      }
    )
  );

  return list;
}

async function init() {
  try {
    await Promise.all(Object.values(providers).map((p) => p.init()));
  } catch (e) {
    cli.error(e);
    return;
  }

  if (!config.reset && file.fileExists(".manifest.json")) {
    try {
      manifest = JSON.parse(file.readFile(".manifest.json"));
      cli.outputManifest(manifest);
      return main();
    } catch (e) {
      cli.error(e);
      cli.info("Error reading manifest file, resetting manifest file.");
      file.deleteFile(".manifest.json");
      shouldHalt = true;
      return;
    }
  } else {
    cli.info(
      config.reset ? "Manually bypassed manifest loading" : "No manifest found"
    );

    // Fetch anime basic data
    const searchQuery =
      config.search ||
      (await cli.inquireQuestion({
        type: "input",
        message: "What's the name of the anime?",
        default: file.animeNameFromDirectory(process.cwd()),
      }));
    /**
     * @type {import('./structures/AnimeProvider').BaseAnime[]}
     */
    const validAnimes = await cli.hookSpinnerToPromise(
      findAnime(searchQuery),
      "Searching for animes..."
    );
    if (!validAnimes || !validAnimes.length) {
      cli.error(new Error("Couldn't find any animes ;-;"));
      shouldHalt = true;
      return;
    }
    /**
     * @type {import('./structures/AnimeProvider').BaseAnime}
     */
    let selectedAnime = null;
    if (validAnimes.length === 1) selectedAnime = validAnimes[0];
    else {
      const validProviders = Array.from(
        validAnimes.reduce((acc, anime) => acc.add(anime.provider), new Set())
      ).map((p) => providers[p]);
      cli.success("Successfully found {num} animes from {count} provider(s)!", {
        num: validAnimes.length,
        count: validProviders.length,
      });
      validProviders.forEach((p) =>
        cli.info(`${p.name} {watermarked} watermarked.`, {
          watermarked: p.watermarked ? "is" : "is not",
        })
      );
      function formatForSort(anime) {
        return `${anime.provider} ${anime.year} ${anime.name}`;
      }
      const sortingArr = validAnimes.map(formatForSort).sort();
      const formattedList = validAnimes
        .sort(
          (a, b) =>
            sortingArr.indexOf(formatForSort(a)) -
            sortingArr.indexOf(formatForSort(b))
        )
        .map((a) => `[${a.provider}] ${a.year}: ${a.name}`);
      const userSelection = await cli.inquireQuestion({
        type: "list",
        message: "Which anime is the right one?",
        choices: [...formattedList, "None of the above"],
      });
      if (userSelection === "None of the above")
        return cli.error(
          new Error("The right anime was nowhere to be found ;-;")
        );
      selectedAnime = validAnimes.find(
        (a) =>
          `[${a.provider}] ${a.year}` === userSelection.split(":")[0] &&
          a.name === userSelection.split(":").slice(1).join(":").trim()
      );
    }
    cli.success('Selected "{year}: {anime}" from {provider}!', {
      provider: selectedAnime.provider,
      year: selectedAnime.year,
      anime: selectedAnime.name,
    });

    // Fetch more complex metadata
    /**
     * @type {import('./lib/apiInteractor').AnimeMetadata}
     */
    const metadata = await cli.hookSpinnerToPromise(
      providers[selectedAnime.provider].info(selectedAnime),
      "Fetching metadata..."
    );

    // Check how much of it is downloaded
    const allFiles = file
      .allFiles(file.getCurrentDirectory())
      .filter((f) => /.*\.(mkv|mp4|avi)/i.test(f));
    if (!allFiles.length) metadata.currentlyDownloading = metadata.episodes[0];
    if (
      allFiles.length &&
      metadata.episodes.some((e) => allFiles.some((a) => a.includes(e)))
    ) {
      metadata.currentlyDownloading = metadata.episodes[allFiles.length - 1];
      metadata.downloadedEpisodes = [
        ...metadata.episodes.slice(
          0,
          allFiles.length - metadata.episodes.length - 2
        ),
      ];
    }

    // Move over the metadata to manifest
    manifest = Object.assign(metadata);
    manifest.downloadedEpisodes = [];
    manifest.elapsedTime = 0;
    manifest.watermarked = providers[metadata.provider].watermarked;
    cli.success("Successfully created manifest for {anime}!", {
      anime: manifest.name,
    });

    // Output the manifest data
    cli.blankLine();
    cli.outputManifest(manifest);

    // Write the manifest data to a file
    if (
      await cli.inquireQuestion({
        type: "confirm",
        message: "Should these be written to the manifest?",
      })
    ) {
      file.writeManifest(manifest);
    } else {
      if (
        !(await cli.inquireQuestion({
          type: "confirm",
          message: "Do you want to start downloading this anime regardless?",
        }))
      ) {
        shouldHalt = true;
        return;
      }
    }

    return main();
  }
}

async function main() {
  try {
    if (!manifest.currentlyDownloading)
      manifest.currentlyDownloading = manifest.episodes[0];
    cli.setTitle(
      `anime-scraper - Downloading ${manifest.name}: Episode ${manifest.currentlyDownloading}`
    );
    let downloadInfo = null;
    let url = await providers[manifest.provider].downloadLink(
      manifest,
      manifest.currentlyDownloading
    );
    if (!Object.values(url).length) {
      cli.error(
        new Error(
          `No download links available for episode ${manifest.currentlyDownloading}`
        )
      );
      shouldHalt = true;
      return;
    }
    if (
      manifest.quality === null ||
      !Object.keys(url).includes(manifest.quality)
    ) {
      if (Object.values(url).length === 1) {
        if (manifest.quality && Object.keys(url)[0] !== manifest.quality) {
          cli.info(
            "Quality available: {available}, quality desired: {desired}. Downloading in {available}...",
            { available: Object.keys(url)[0], desired: manifest.quality }
          );
        }
        url = Object.values(url)[0];
      } else {
        const userSelection = await cli.inquireQuestion({
          type: "list",
          message: "What quality should the anime be downloaded in?",
          choices: [...Object.keys(url), "None of the above"],
        });
        if (userSelection == "None of the above") {
          cli.error(new Error("Desired quality is unavailable"));
          shouldHalt = true;
          return;
        } else {
          url = url[userSelection];
          manifest.quality = userSelection;
          file.writeManifest(manifest);
        }
      }
    } else {
      url = url[manifest.quality];
      cli.info("Selected {quality} for episode {ep}", {
        quality: manifest.quality,
        ep: manifest.currentlyDownloading,
      });
    }
    const urlInfo = await http.info(url);
    const allFiles = file
      .allFiles(file.getCurrentDirectory())
      .filter((f) => /.*\.(mkv|mp4|avi)/i.test(f));
    let fileInfo = file.extendedInfo(
      file.fileNameForEpisode(
        manifest.currentlyDownloading,
        file.extension(url)
      )
    );
    if (
      allFiles.some(
        (f) =>
          f.includes(manifest.currentlyDownloading) &&
          f !=
            file.fileNameForEpisode(
              manifest.currentlyDownloading,
              file.extension(url)
            )
      ) ||
      (fileInfo && fileInfo.size >= parseInt(urlInfo.headers["content-length"]))
    ) {
      cli.info("Episode {ep} is already fully downloaded.", {
        ep: manifest.currentlyDownloading,
      });
      manifest.elapsedTime = 0;
      const currentDownloadIndex = manifest.episodes.indexOf(
        manifest.currentlyDownloading
      );
      manifest.downloadedEpisodes.push(manifest.currentlyDownloading);
      if (currentDownloadIndex + 1 === manifest.episodes.length) {
        cli.success("Successfully downloaded {anime} entirely!", {
          anime: manifest.name,
        });
        shouldHalt = true;
        return;
      }
      manifest.currentlyDownloading =
        manifest.episodes[currentDownloadIndex + 1];
      file.writeManifest(manifest);
      return main();
    } else {
      fileInfo = {
        size: 0,
      };
      downloadInfo = await http.downloadFile(
        url,
        file.fileNameForEpisode(
          manifest.currentlyDownloading,
          file.extension(url)
        ),
        config.ratelimit
      );
    }
    if (fileInfo && fileInfo.size < parseInt(urlInfo.headers["content-length"]))
      downloadInfo = await http.resumeFile(
        url,
        file.fileNameForEpisode(
          manifest.currentlyDownloading,
          file.extension(url)
        ),
        config.ratelimit
      );

    let startTime = Date.now() - manifest.elapsedTime;
    cli.info("Downloading episode {ep} of {anime}", {
      ep: manifest.currentlyDownloading,
      anime: manifest.name,
    });
    cli.blankLine();
    fileInfo = file.extendedInfo(
      file.fileNameForEpisode(
        manifest.currentlyDownloading,
        file.extension(url)
      )
    ) || { size: 0 };
    let previousDownloadValue = fileInfo.size;
    let zeroesInARow = 0;
    const downloadUpdateInterval = util.interval.set(() => {
      cli.clearLine();
      const downloaded = downloadInfo.bytesWritten + fileInfo.size;
      const fullSize = parseInt(urlInfo.headers["content-length"]);
      if (downloaded - previousDownloadValue === 0) {
        zeroesInARow++;
        startTime += 1000;
      }
      if (zeroesInARow >= 15) {
        util.interval.clear(downloadUpdateInterval);
        zeroesInARow = 0;
        downloadInfo.end();
        throw new Error("Speed too slow");
        return;
      }
      const elapsedTime = new Date(Date.now() - startTime);
      manifest.elapsedTime = Date.now() - startTime;
      file.writeManifest(manifest);

      cli.showGauge(
        downloaded,
        fullSize,
        `${Math.round((downloaded / fullSize) * 100)}% | ${util.dateFormat(
          elapsedTime
        )} | ${util.convertBytes(downloaded)} / ${util.convertBytes(
          fullSize
        )} | ${util.convertBytes(downloaded - previousDownloadValue)}ps`
      );
      previousDownloadValue = downloaded;
    }, 1000);
    downloadInfo.on("close", () => {
      if (
        downloadInfo.bytesWritten + fileInfo.size <
        parseInt(urlInfo.headers["content-length"])
      ) {
        manifest.elapsedTime = Date.now() - startTime;
        file.writeManifest(manifest);
        return main();
      }
      util.interval.clear(downloadUpdateInterval);
      const elapsedTime = new Date(Date.now() - startTime);
      cli.success(
        "Downloaded {anime} - {ep} in {time} with an average speed of {avg}",
        {
          avg:
            util.convertBytes(
              parseInt(urlInfo.headers["content-length"]) / (elapsedTime / 1000)
            ) + "ps",
          ep: manifest.currentlyDownloading,
          anime: manifest.name,
          time: `${util.dateFormat(elapsedTime)}`,
        }
      );
      manifest.elapsedTime = 0;
      const currentDownloadIndex = manifest.episodes.indexOf(
        manifest.currentlyDownloading
      );
      manifest.downloadedEpisodes.push(manifest.currentlyDownloading);
      if (currentDownloadIndex + 1 === manifest.episodes.length) {
        cli.success("Successfully downloaded {anime} entirely!", {
          anime: manifest.name,
        });
        shouldHalt = true;
      }
      manifest.currentlyDownloading =
        manifest.episodes[currentDownloadIndex + 1];
      file.writeManifest(manifest);
      return main();
    });
  } catch (e) {
    error(e);
  }
}

module.exports = async (conf) => {
  config = conf;
  await init();
};
