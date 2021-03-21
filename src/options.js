module.exports = {
  port: {
    describe: "Port to run the model-browser server on.",
    type: "number",
    defaultDescription: "auto",
    alias: "p",
  },
  flip: {
    describe: "Whether models should be flipped.",
    type: "boolean",
    default: false,
    alias: "f",
  },
  linear: {
    describe:
      "Whether models should be rendered using linear encoding. The default is sRGB encoding.",
    type: "boolean",
    default: false,
    alias: "l",
  },
  recursive: {
    describe:
      "Whether files should be listed recursively, if [files] is a directory.",
    type: "boolean",
    default: false,
    alias: "r",
  },
  open: {
    describe: "Whether model-browser should automatically open your browser. Disable this behavior with --no-open.",
    type: "boolean",
    default: true,
    alias: "o",
  },
  "allow-cors": {
    describe:
      "A comma-separated list of origins to allow requests from. Can also be set to '*', but you should understand the security implications first.",
    type: "string",
    alias: "c",
  },
  "timeout-minutes": {
    describe:
      "Kill the server if it hasn't received a request in this many minutes. The server will remain running as long as you have model-browser open in a browser tab. Set this to 0 to disable the timeout.",
    type: "number",
    default: 15,
    alias: "t",
  },
  help: { alias: "h" },
  version: { alias: "v" },
};
