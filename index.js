#!/usr/bin/env node
"use strict";

const title = process.title;

const chalk = require("chalk");
let text = `               _          _                   _     
 __      _____| |__  _ __(_)_ __  _ __   __ _| |__
 \\ \\ /\\ / / _ \\ '_ \\| '__| | '_ \\| '_ \\ / _\` | '_ \\
  \\ V  V /  __/ |_) | |  | | |_) | |_) | (_| | | | |
   \\_/\\_/ \\___|_.__/|_|  |_| .__/| .__/ \\__,_|_| |_|
                           |_|   |_|
`;
const { util, cli } = require("./lib");
cli.clearScreen();
console.log(
  chalk.cyan`${`Created by ${chalk.greenBright("WovenCoast")}`.padStart(
    69
  )}\n${text}`
);

const main = require("./main");
const cmdInput = require("meow")(
  `
  Usage
    $ webrippah [name]
  
  Options
    --reset, -r     (false)     Reset manifest 
    --throttle, -t  (Infinity)  Bytes per second to throttle the stream data at

  Examples
    $ anime Neon Genesis Evangelion 
    $ anime Boku no Hero Academia -t 40mb
`,
  {
    flags: {
      reset: {
        type: "boolean",
        alias: "r",
      },
      throttle: {
        type: "string",
        alias: "t",
      },
      debug: {
        type: "boolean",
        alias: "d",
      },
    },
  }
);
cli.setTitle(`webrippah - ${process.cwd()}`);
process.on("kill", () => {
  cli.setTitle(title);
});
if (cmdInput.flags.debug) process.env.DEBUG = true;
const config = {
  search: cmdInput.input.join(" "),
  reset: cmdInput.flags.reset,
  ratelimit: util.convertHumanReadableBytes(cmdInput.flags.throttle),
};
main(config);
