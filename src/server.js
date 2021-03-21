#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const express = require("express");
const open = require("open");
const portfinder = require("portfinder");
const recursive = require("recursive-readdir");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");

const options = require("./options");

const { argv } = yargs(hideBin(process.argv))
  .scriptName("model-browser")
  .wrap(require("yargs").terminalWidth())
  .command("$0 [files..]", "model-browser", (yargs) => {
    yargs.positional("files", {
      describe:
        "Path to a directory containing models you want to browse, or a list of file paths. Files can also be piped in.",
      type: "array",
    });
    yargs.options(options);
  });

function cleanPath(filePath) {
  // The replaces here get rid of quotes that some terminals add.
  return filePath.trim().replace(/^'/, "").replace(/'$/, "").replace(/"$/, "");
}

const state = {
  stdin: "",
  filesIsList: null,
  filesList: [],
  basePath: null,
  timeoutId: null,
};

try {
  state.stdin = fs.readFileSync(process.stdin.fd, "utf-8");
} catch (e) {
  // no content in stdin.
}
state.filesIsList = cleanPath(state.stdin || argv.files[0] || "").endsWith(
  ".glb"
);

state.basePath = state.filesIsList
  ? null
  : path.resolve(cleanPath(argv.files[0]));
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

function fullUrl(origin) {
  if (!origin.startsWith("http")) return `https://${origin}`;
  else return origin;
}

function maybeAddCors(req, res) {
  const requestOrigin = req.get("origin");
  if (!requestOrigin) return;
  if (!argv.allowCors) return;

  const allowedOrigins = argv.allowCors
    .split(",")
    .map((s) => s.trim())
    .map(fullUrl);

  if (argv.allowCors === "*" || allowedOrigins.includes(requestOrigin)) {
    res.set("access-control-allow-origin", requestOrigin);
    console.log(`Allowing request to ${req.path} from ${requestOrigin}`);
  }
}

function restartTimeout() {
  if (state.timeoutId) clearTimeout(state.timeoutId);

  if (argv.timeoutMinutes === 0) return;

  state.timeoutId = setTimeout(() => {
    console.log(
      `No requests received in ${argv.timeoutMinutes} minutes. Killing server.`
    );
    process.exit(0);
  }, argv.timeoutMinutes * 60 * 1000);
}

app.get("/files", async (req, res) => {
  res.send({ basePath: state.basePath, files: state.filesList });
});

app.get(/\/files\/.*/, (req, res) => {
  maybeAddCors(req, res);

  const filePath = decodeURIComponent(req.path.substring(7));

  if (!state.filesList.includes(filePath)) {
    res.sendStatus(404);
    return;
  }
  if (state.filesIsList) {
    res.sendFile(filePath);
  } else {
    res.sendFile(path.join(state.basePath, filePath));
  }
});

app.get("/heartbeat", (req, res) => {
  if (req.get("origin")) {
    res.sendStatus(404);
    return;
  }

  restartTimeout();

  res.send("ok");
});

(async () => {
  if (state.filesIsList) {
    state.filesList = state.stdin ? state.stdin.split(/[\r\n]/) : argv.files;
    state.filesList = state.filesList
      .flatMap((s) => s.split(/[\r\n]/))
      .map((s) => s.trim())
      .filter((s) => s.length)
      .map((s) => path.resolve(s));
  } else {
    if (argv.recursive) {
      state.filesList = (await recursive(state.basePath)).map((file) =>
        file.replace(state.basePath + path.sep, "")
      );
    } else {
      state.filesList = fs.readdirSync(state.basePath);
    }
  }
  state.filesList = state.filesList.filter((file) => file.endsWith(".glb"));

  let port = argv.port || (await portfinder.getPortPromise());
  app.listen(port, () => {
    const params = [];
    if (argv.flip) params.push("flip");
    if (argv.linear) params.push("linear");

    const url = `http://localhost:${port}${
      params.length ? "?" + params.join("&") : ""
    }`;

    if (argv.open === false) {
      console.log(`Model browser running at ${url}.`);
    } else {
      console.log(`Opening model browser at ${url}.`);
      open(url);
    }

    restartTimeout();
  });
})();
