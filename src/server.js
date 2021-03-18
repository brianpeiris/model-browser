#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const express = require("express");
const open = require("open");
const portfinder = require("portfinder");
const recursive = require("recursive-readdir");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");

const { argv } = yargs(hideBin(process.argv)).command(
  "$0 [path]",
  "model-browser",
  (yargs) => {
    yargs.positional("path", {
      describe: "Path containing models you want to browse",
      type: "string",
      default: ".",
    });
    yargs.options({
      port: {
        describe: 'Port to run the model-browser server on.',
        type: 'number',
        defaultDescription: 'first available port'
      },
      flip: {
        describe: 'Whether models should be flipped',
        type: 'boolean',
        default: false
      },
      recursive: {
        describe: 'Whether files should be listed recursively',
        type: 'boolean',
        default: false
      },
      open: {
        describe: 'Whether model-browser should automatically open your browser',
        type: 'boolean',
        default: true
      },
    });
  }
);

const basePath = path.resolve(argv.path.replace(/^'/, '').replace(/'$/, '').replace(/"$/, ''));

const app = express();

if (process.env.NODE_ENV === "development") {
  const livereload = require("easy-livereload");
  app.use(
    livereload({
      watchDirs: [path.join(__dirname, "..", "public")],
      checkFunc: (file) => /\.(css|js|html)$/.test(file),
    })
  );
}

app.use(express.static(path.resolve(__dirname, "..", "public")));
app.use(
  "/node_modules",
  express.static(path.resolve(__dirname, "..", "node_modules"))
);

app.get("/files", async (req, res) => {
  let files;
  if (argv.recursive) {
    files = (await recursive(basePath)).map(file => file.replace(basePath + path.sep, ""));
  } else {
    files = fs.readdirSync(basePath);
  }
  res.send({
    basePath,
    files: files.filter((file) => file.endsWith(".glb")),
  });
});

app.get(/\/files\/.*/, (req, res) => {
  res.sendFile(path.join(basePath, decodeURIComponent(req.path.substring(7))));
});

(async () => {
  let port = argv.port || (await portfinder.getPortPromise());
  app.listen(port, () => {
    const url = `http://localhost:${port}${argv.flip ? "?flip" : ""}`;
    if (argv.open === false) {
      console.log(`Model browser running at ${url}.`);
    } else {
      console.log(`Opening model browser at ${url}.`);
      open(url);
    }
  });
})();
