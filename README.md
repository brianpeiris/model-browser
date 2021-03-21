# model-browser

model-browser is a command line tool for browsing local 3D models via a web browser. It currently only supports GLB files.

## Installation and Usage

```
$ npm install -g model-browser
$ model-browser
```

OR 

```
$ npx model-browser
```

---

```
model-browser [files..]

Positionals:
  files  Path to a directory containing models you want to browse, or a list of
         file paths. Files can also be piped in.

Options:
  -h, --help                                                           [boolean]
  -v, --version                                                        [boolean]
  -p, --port             Port to run the model-browser server on.
                                                        [number] [default: auto]
  -f, --flip             Whether models should be flipped.
                                                      [boolean] [default: false]
  -l, --linear           Whether models should be rendered using linear
                         encoding. The default is sRGB encoding.
                                                      [boolean] [default: false]
  -r, --recursive        Whether files should be listed recursively, if [files]
                         is a directory.              [boolean] [default: false]
  -o, --open             Whether model-browser should automatically open your
                         browser. Disable this behavior with --no-open.
                                                       [boolean] [default: true]
  -c, --allow-cors       A comma-separated list of origins to allow requests
                         from. Can also be set to '*', but you should understand
                         the security implications first.               [string]
  -t, --timeout-minutes  Kill the server if it hasn't received a request in this
                         many minutes. The server will remain running as long as
                         you have model-browser open in a browser tab. Set this
                         to 0 to disable the timeout.     [number] [default: 15]
```

---

![A screenshot of model-browser](https://user-images.githubusercontent.com/79419/111898136-84eebd80-89fa-11eb-945b-0ec4e249e9c5.png)


