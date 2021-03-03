/**
 * pici-engine that can be invoked via the cli.
 * 
 * invoke this program from the commandline with the 
 * following arguments.
 * 
 * Argument 1: picidae reference
 * Argument 2: url to invoke
 * 
 * ```sh
 * node pici-cli.js filename https://url.com
 * ```
 */

const pici = require("./pici-engine");

(async () => {
    // get cli variable
    const myArgs = process.argv;
    const piciref = myArgs[2];
    const url = myArgs[3];

    await pici.engine(piciref, url);
})();
