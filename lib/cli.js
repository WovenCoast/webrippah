const childProcess = require('child_process');
const inquirer = require('inquirer');
const consoleModule = require('console');
const clui = require('clui');
const chalk = require('chalk');

const util = require('./util');

const spinner = new clui.Spinner();
module.exports = {
  clearScreen() {
    process.stdout.write('\033c')
  },
  setTitle(title) {
    childProcess.execSync(`title ${title}`);
  },
  startSpinner(text) {
    spinner.message(chalk.white(text));
    spinner.start();
  },
  updateSpinner(text) {
    spinner.message(chalk.white(text));
  },
  stopSpinner() {
    spinner.stop();
  },
  disableConsole() {
    console = { log: () => {} };
  },
  enableConsole() {
    console = consoleModule.Console({ stdout: process.stdout, stderr: process.stderr });
  },
  showGauge(value, maxValue, human) {
    console.log(clui.Gauge(value, maxValue, 20, maxValue, chalk.white(human)));
  },
  blankLine() {
    console.log("")
  },
  countdown(s, text) {
    return new Promise((resolve, reject) => {
      let secondsLeft = s;
      this.startSpinner(text.replace('{s}', secondsLeft));
      const handler = () => {
        this.updateSpinner(text.replace('{s}', secondsLeft))
        secondsLeft--;
        if (secondsLeft < 0) {
          util.interval.clear(interval);
          resolve(true);
        }
      };
      handler();
      const interval = util.interval.set(handler, 1000);
    });
  },
  clearLine() {
    process.stdout.moveCursor(0, -1);
    process.stdout.clearLine(1);
  },
  /**
   * @param {Promise<T>} promise The promise to hook the spinner onto
   * @param {string} text The text to be displayed on the spinner
   */
  hookSpinnerToPromise(promise, text) {
    spinner.message(text);
    spinner.start();
    return promise.then(result => {
      spinner.stop();
      return result;
    }).catch(err => {
      spinner.stop();
      this.error(err);
      return null;
    });
  },
  getArgv() {
    return require('minimist')(process.argv.slice(2));
  },
  async inquireQuestion(question) {
    question.name = "result";
    const { result } = await inquirer.prompt([question]);
    return result;
  },
  outputManifest(manifest) {
    console.log(
      [
        `${chalk.cyan(chalk.bold("Provider"))}: ${chalk.bold(manifest.provider)}`,
        `${chalk.cyan(chalk.bold("Name"))}: ${chalk.bold(manifest.name)}`,
        `${chalk.cyan(chalk.bold("Description"))}: ${manifest.description}`,
        `${chalk.cyan(chalk.bold("Genre"))}: ${manifest.genres.map(g => chalk.bold(g)).join(", ")}`,
        `${chalk.cyan(chalk.bold("Status"))}: ${chalk.bold(manifest.status)}`,
        `${chalk.cyan(chalk.bold("Episodes"))}: ${chalk.bold(manifest.episodes[0])} to ${chalk.bold(manifest.episodes[manifest.episodes.length - 1])}`,
        `${!manifest.currentlyDownloading ? undefined : `${chalk.cyan(chalk.bold("Currently downloading"))}: ${chalk.bold(manifest.currentlyDownloading)}`}`,
        `${chalk.cyan(chalk.bold("Released"))}: ${chalk.bold(manifest.year)}`,
        `${chalk.cyan(chalk.bold("Link"))}: ${manifest.link}`,
      ].filter(v => v !== undefined).join("\n") + "\n"
    );
  },
  error(err) {
    console.log(`${chalk.redBright("X")} Something went wrong: ${chalk.bold(err.message)}`);
    if (process.env.DEBUG) console.log(err);
  },
  success(message, highlights = {}) {
    console.log(`${chalk.greenBright('✓')} ${!Object.keys(highlights).length ? message : Object.keys(highlights).reduce((acc, key) => acc.replace(`{${key}}`, chalk.bold(highlights[key])), message)}`)
  },
  info(message, highlights = {}) {
    console.log(`${chalk.cyan('!')} ${!Object.keys(highlights).length ? message : Object.keys(highlights).reduce((acc, key) => acc.replace(`{${key}}`, chalk.bold(highlights[key])), message)}`)
  }
}