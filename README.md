# Pici Server (version 5)

This is the 5th version of the pici-server of the picidae project
by Christoph Wachter & Mathias Jud.

It creates interactive screenshots of web pages, to navigate, watch
and static web pages from other locations.

## Install

The following software needs to be installed:

- yarn
- mongodb

Checkout the pici-server repository:

```sh
git clone https://github.com/picidae-project/pici-server.git
cd pici-server
```

Download and install the needed chrome extension:

1) download version `v1.1.4` of the plugin `I still don't care about cookies` via the following link:
   <https://github.com/OhMyGuus/I-Still-Dont-Care-About-Cookies/releases/download/v1.1.4/ISDCAC-chrome-source.zip>
2) Unpack the zip folder into the `chrome_extensions` folder of this repository.
3) The path now needs now to look like this `chrome_extensions/ISDCAC-chrome-source`

The pici-server runs in nodejs, using puppeteer and chrome as a
rendering engine.

To install required packages there is a yarn package install:

```sh
# To install Puppeteer with chromium via yarn, 
# just run yarn in this directory
yarn
```

You finished the installation and can now run the pici-server

## Run Server

To start the pici server run the following command:

```sh
node ./pici-server.js
```

The pici-server is reachable via <http://127.0.0.1:3000/>

## License

Pici-Server is licensed under the GPL license version 3,
see the LICENSE file.

(c) Christoph Wachter & Mathias Jud 2007-2025
