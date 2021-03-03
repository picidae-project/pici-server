/**
 * pici-engine module that can be included in apps.
 * 
 * ```js
 * // include engine
 * const pici = require("./pici-engine.js");
 * 
 * // use engine
 * await pici.engine("wikipedia", "https://wikipedia.org");
 * ```
 */

const puppeteer = require('puppeteer');
//const util = require('util');
const fs = require('fs');
const { type } = require('os');


module.exports = {
  engine: async function (piciref, address) 
  {
    const path = 'pici/' +piciref;
    //console.log("pici-engine: piciref: " +piciref);

    const browser = await puppeteer.launch({
        pipe: true,
        enableExtensions: ['chrome_extensions/ISDCAC-chrome-source'],
    });
    const page = await browser.newPage();
    // set viewport size
    await page.setViewport({ width: 1280, height: 720 });

    // enable logging from within page requests
    //page.on('console', async (msg) => {
    //  const msgArgs = msg.args();
    //  for (let i = 0; i < msgArgs.length; ++i) {
    //    console.log(await msgArgs[i].jsonValue());
    //  }
    //});

    // load page
    await page.goto(address, {
      waitUntil: 'networkidle2',
    });

    // create screenshot
    const screenshot = await page.screenshot({ 
      path: path +'.png',
      fullPage : true
    });
    let state = 2; // success
    if (screenshot === undefined) {
      console.log("screenshot failed");
      const empty_array = [];
      state = 3; // error
      return { state, empty_array, empty_array};
    }
    //console.log(`screenshot result: ${state}`);

    // select link elements with location
    const linksjson = await page.evaluate(() => {
      // get all links
      let links = [];
      let a = document.getElementsByTagName('a');
      for (i = 0; i < a.length; i++) {
        // check link visibility
        let visibility = window.getComputedStyle(a[i]).visibility;
        if (visibility === "hidden") {
          continue;
        }

        // get link bounding box
        const { x, y, width, height } = a[i].getBoundingClientRect();
        if (width === 0 && height === 0) {
          continue;
        }
        
        let link = {
          href: a[i].href,
          rect: { x, y, width, height }
        }

        links.push(link);
      }
      return links;
    });

    // analyze page for form elements
    // methods to get children DOM elements
    // https://github.com/puppeteer/puppeteer/issues/4852
    const formjson = await page.evaluate(() => {
      let formsarray = [];
      
      let forms = document.getElementsByTagName('form');
      //console.log("form length: " +forms.length);
      
      for (i = 0; i < forms.length; i++) {
        // check form visibility
        const visibility = window.getComputedStyle(forms[i]).visibility;
        if (visibility === "hidden") {
          continue;
        }

        let action = forms[i].action;
        if (action === undefined) {
          //action = page.location.href;
        }

        let form = {
          action: action,
          method: forms[i].type,
          inputs: []
        }

        // loop through the child elements
        // get all input fields
        let inputs = forms[i].getElementsByTagName('input');
        for (j = 0; j < inputs.length; j++) {
          let input = {
            tag: "input",
            type: inputs[j].type,
            name: inputs[j].name,
            value: inputs[j].value,
            min: inputs[j].min,
            max: inputs[j].max,
            checked: inputs[j].checked,
            required: inputs[j].required,
            rect: { x: inputs[j].getBoundingClientRect().x, y: inputs[j].getBoundingClientRect().y, width: inputs[j].getBoundingClientRect().width, height: inputs[j].getBoundingClientRect().height }
          }
          form.inputs.push(input);
        }
        // get all textarea fields
        inputs = forms[i].getElementsByTagName('textarea');
        for (j = 0; j < inputs.length; j++) {
          let input = {
            tag: "textarea",
            name: inputs[j].name,
            rows: inputs[j].rows,
            cols: inputs[j].cols,
            rect: { x: inputs[j].getBoundingClientRect().x, y: inputs[j].getBoundingClientRect().y, width: inputs[j].getBoundingClientRect().width, height: inputs[j].getBoundingClientRect().height }
          }
          form.inputs.push(input);
        }
        // yet unhandled form fields:
        // <button>,
        // <datalist>,
        // <output>, 
        // <select>,<option>,<optgroup>

        formsarray.push(form);
      }
      
      return formsarray;
    });

    await browser.close();

    return { "state": state, "maps": linksjson, "forms": formjson };
  }
};
