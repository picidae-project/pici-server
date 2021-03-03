/**
 * pici server page generator
 */
const fs = require('fs');
const storage = require("./storage");
const pici = require("./pici-engine");
const urlSafety = require("./urlSafety");
//const e = require('express');
const { createCanvas, loadImage } = require('canvas');
const { create } = require('domain');


/**
 * generate start page
 */
async function start(client) {
    // create new page object
    let page = storage.getNewPageObject();
    let uuid = page._id;
    page.session = crypto.randomUUID();
    page.key = "8bytekey";
    //let key = Math.random().toString(36).substring(2, 15);

    // insert page into database
    await storage.insertPage(client, page);

    // load templates
    let head = fs.readFileSync('templates/head.html', {encoding: 'utf8'});
    head = head.replace('{key}', page.key);
    let start = fs.readFileSync('templates/start.html', {encoding: 'utf8'});
    start = start.replace('{ref}', uuid);
    let html = fs.readFileSync('templates/html.html', {encoding: 'utf8'});
    html = html.replace('{HEAD}', head);
    html = html.replace('{BODY}', start);

    return html;
}

/**
 * generate picture page
 * @param {string} piciref - picidae reference
 */
async function createPage(client, page) {
    // display that this page is being rendered
    page.state = 1;
    page.updated = new Date();
    await storage.updatePage(client, page);

    // check if URL is legitimate
    const url = page.url;
    const piciref = page._id;
    const safety = urlSafety.checkUrlSafety(url);

    if (safety != "ok") { 
        // create error image
        await createErrorImage(safety, url, piciref);

        // create error page
        let html = fs.readFileSync('templates/error.html', {encoding: 'utf8'});
        html = html.replace('{uuid}', piciref);
        return html;
    }

    // create picture
    let result = await pici.engine(piciref, url);

    let html = "";
    if (result.state === 2) {
        // update page state
        page.state = 2;
        page.updated = new Date();
        page.maps = result.maps;
        page.forms = result.forms;
        await storage.updatePage(client, page);

        // create html
        let key = "8bytekey";
        let head = fs.readFileSync('templates/head.html', {encoding: 'utf8'});
        head = head.replace('{key}', key);
        let content = fs.readFileSync('templates/page.html', {encoding: 'utf8'});
        content = content.replace('{uuid}', piciref);
        content = content.replace('{map}', await imagemap(client, page));
        content = content.replace('{forms}', await forms(client, page));
        html = fs.readFileSync('templates/html.html', {encoding: 'utf8'});
        html = html.replace('{HEAD}', head);
        html = html.replace('{BODY}', content);    
    }
    else {
        // create error image
        await createErrorImage("download", url, piciref);

        // update page state
        page.state = 3;
        page.updated = new Date();
        await storage.updatePage(client, page);

        // create error page
        let html = fs.readFileSync('templates/error.html', {encoding: 'utf8'});
        html = html.replace('{uuid}', piciref);
        return html;
        
    }

    return html;
}

/**
 * create error image
 */
async function createErrorImage(error, text, imagename) {
    // log error
    console.error("Error creating page: ", error);

    // create error image
    var imagePath = 'assets/error_notresponding.png';
    if (error == "download") { 
        imagePath = 'assets/error_download.png';
    } else if (error == "email") {
        imagePath = 'assets/error_email.png';
    } else if (error == "unhandled") {
        imagePath = 'assets/error_unhandled.png';
    }

    const myimg = await loadImage(imagePath);
    const canvas = createCanvas(myimg.width, myimg.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(myimg, 0, 0, myimg.width, myimg.height);
    // add text to image
    ctx.font = '14px Arial';
    ctx.fillStyle = 'grey';
    ctx.fillText(text, 10, myimg.height - 10, myimg.width - 20);
    // save image
    const buffer = canvas.toBuffer('image/png');
    await fs.promises.writeFile("pici/" + imagename + ".png", buffer);
}

/**
 * generate imagemap tags
 */
async function imagemap(client, page) {
    // check if maps are available
    const links = page.maps;

    // check if image maps links are available
    if (links.length === 0) {
        return "";
    }

    // create image maps
    let maps = "<map name=\"map\">\n";

    for (i = 0; i < links.length; i++)
    {
        // skip non clickable links
        if (links[i].rect.x === 0 && links[i].rect.y === 0 && links[i].rect.width === 0 && links[i].rect.height === 0) {
            continue;
        }
        
        // get page object
        let new_page = await storage.getNewPageObject();
        new_page.url = links[i].href;
        new_page.session = page._id;
        new_page.type = 1; // link page

        // insert link into database
        storage.insertPage(client, new_page);

        // create area for image map
        maps += "<area shape=\"rect\" ";
        maps += "coords=\"" +links[i].rect.x +"," +links[i].rect.y +"," +(links[i].rect.x+links[i].rect.width) +"," +(links[i].rect.y+links[i].rect.height) +"\" ";
        maps += "alt=\"\" "; 
        maps += "href=\"/?r=" + new_page._id + "\"";
        maps += ">\n";
    }
    maps += "</map>";

    return maps;
}

/**
 * generate form tags
 * @param {MongoClient} client - mongodb client
 * @param {Page} page - page object
 */
async function forms(client, page) {
    formsarray = page.forms;
    // check if image maps links are available
    if (formsarray.length === 0) {
        return "";
    }

    // create image maps
    let forms = "";

    for (i = 0; i < formsarray.length; i++)
    {
        // create new page object
        let new_page = await storage.getNewPageObject();
        new_page.type = 2;
        new_page.url = formsarray[i].href;
        new_page.session = page._id;
        new_page.key = "8bytekey";
        new_page.formfields = formsarray[i];

        // insert link into database
        storage.insertPage(client, new_page);
        
        // create form html
        let form = "<form action=\"\" method=\"get\"  onsubmit=\"check(event)\">\n";
        form += "<input type=\"hidden\" name=\"r\" value=\"" + new_page._id + "\">\n";

        // radio checkbox groups
        let radio_index = 1000;
        let radio_name = "";
        // loop through the input fields
        for (j = 0; j < formsarray[i].inputs.length; j++) {
            // skip non visible fields
            if (formsarray[i].inputs[j].rect.x === 0 && formsarray[i].inputs[j].rect.y === 0 && formsarray[i].inputs[j].rect.width === 0 && formsarray[i].inputs[j].rect.height === 0) {
                continue;
            }

            // create form fields
            if (formsarray[i].inputs[j].tag === "input") {
                if (
                    formsarray[i].inputs[j].type === "hidden" || 
                    formsarray[i].inputs[j].type === "button" ||
                    formsarray[i].inputs[j].type === "reset" ||
                    formsarray[i].inputs[j].type === "image" ||
                    formsarray[i].inputs[j].type === "file") {
                        // don't publish these fields
                } else if (
                    formsarray[i].inputs[j].type === "text" || 
                    formsarray[i].inputs[j].type === "password" || 
                    formsarray[i].inputs[j].type === "email" || 
                    formsarray[i].inputs[j].type === "url" ||
                    formsarray[i].inputs[j].type === "tel" ||
                    formsarray[i].inputs[j].type === "search") {
                        form += "<input type=\"" + formsarray[i].inputs[j].type + "\" ";
                        form += "name=\"" + j + "\" ";
                        //form += "value=\"" + formsarray[i].inputs[j].value + "\" ";
                        form += "value=\"\" ";
                        form += "style=\"position:absolute; left:" + formsarray[i].inputs[j].rect.x + "px; top:" + formsarray[i].inputs[j].rect.y + "px; width:" + formsarray[i].inputs[j].rect.width + "px; height:" + formsarray[i].inputs[j].rect.height + "px;\" ";
                        if (formsarray[i].inputs[j].required) {
                            form += "required";
                        }
                        form += ">\n";
                } else if (
                    formsarray[i].inputs[j].type === "submit") {
                        form += "<input type=\"" + formsarray[i].inputs[j].type + "\" ";
                        form += "name=\"" + j + "\" ";
                        form += "style=\"position:absolute; left:" + formsarray[i].inputs[j].rect.x + "px; top:" + formsarray[i].inputs[j].rect.y + "px; width:" + formsarray[i].inputs[j].rect.width + "px; height:" + formsarray[i].inputs[j].rect.height + "px;\" ";
                        form += ">\n";
                } else if (
                    formsarray[i].inputs[j].type === "checkbox") {
                        form += "<input type=\"" + formsarray[i].inputs[j].type + "\" ";
                        form += "name=\"" + j + "\" ";
                        form += "style=\"position:absolute; left:" + formsarray[i].inputs[j].rect.x + "px; top:" + formsarray[i].inputs[j].rect.y + "px; width:" + formsarray[i].inputs[j].rect.width + "px; height:" + formsarray[i].inputs[j].rect.height + "px;\" ";
                        if (formsarray[i].inputs[j].checked) {
                            form += "checked";
                        }
                        form += ">\n";
                } else if (
                    formsarray[i].inputs[j].type === "radio") {
                        if (radio_name !== formsarray[i].inputs[j].name) {
                            radio_index = radio_index + 1;
                            radio_name = formsarray[i].inputs[j].name;
                        }
                        form += "<input type=\"" + formsarray[i].inputs[j].type + "\" ";
                        form += "name=\"" + radio_index + "\" ";
                        form += "value=\"" + j + "\" ";
                        form += "style=\"position:absolute; left:" + formsarray[i].inputs[j].rect.x + "px; top:" + formsarray[i].inputs[j].rect.y + "px; width:" + formsarray[i].inputs[j].rect.width + "px; height:" + formsarray[i].inputs[j].rect.height + "px;\" ";
                        if (formsarray[i].inputs[j].checked) {
                            form += "checked";
                        }
                        form += ">\n";
                } else if (
                    formsarray[i].inputs[j].type === "number" ||
                    formsarray[i].inputs[j].type === "range" ||
                    formsarray[i].inputs[j].type === "color" ||
                    formsarray[i].inputs[j].type === "date" ||
                    formsarray[i].inputs[j].type === "datetime-local" ||
                    formsarray[i].inputs[j].type === "month" ||
                    formsarray[i].inputs[j].type === "time" ||
                    formsarray[i].inputs[j].type === "week") {
                        form += "<input type=\"" + formsarray[i].inputs[j].type + "\" ";
                        form += "name=\"" + j + "\" ";
                        form += "value=\"" + formsarray[i].inputs[j].value + "\" ";
                        form += "min=\"" + formsarray[i].inputs[j].min + "\" ";
                        form += "max=\"" + formsarray[i].inputs[j].max + "\" ";
                        form += "style=\"position:absolute; left:" + formsarray[i].inputs[j].rect.x + "px; top:" + formsarray[i].inputs[j].rect.y + "px; width:" + formsarray[i].inputs[j].rect.width + "px; height:" + formsarray[i].inputs[j].rect.height + "px;\" ";
                        if (formsarray[i].inputs[j].required) {
                            form += "required";
                        }
                        form += ">\n";
                }
            } else if (formsarray[i].inputs[j].tag === "textarea") {
                // send an input field if text area has only one row
                if (formsarray[i].inputs[j].rows === 1) {
                    form += "<input type=\"" + formsarray[i].inputs[j].type + "\" ";
                    form += "name=\"" + j + "\" ";
                    form += "value=\"\" ";
                    form += "style=\"position:absolute; left:" + formsarray[i].inputs[j].rect.x + "px; top:" + formsarray[i].inputs[j].rect.y + "px; width:" + formsarray[i].inputs[j].rect.width + "px; height:" + formsarray[i].inputs[j].rect.height + "px;\" ";
                    if (formsarray[i].inputs[j].required) {
                        form += "required";
                    }
                    form += ">\n";
                } else {
                    form += "<textarea name=\"" + j + "\" ";
                    form += "rows=\"" + formsarray[i].inputs[j].rows + "\" ";
                    form += "cols=\"" + formsarray[i].inputs[j].cols + "\" ";
                    form += "style=\"position:absolute; left:" + formsarray[i].inputs[j].rect.x + "px; top:" + formsarray[i].inputs[j].rect.y + "px; width:" + formsarray[i].inputs[j].rect.width + "px; height:" + formsarray[i].inputs[j].rect.height + "px;\" ";
                    if (formsarray[i].inputs[j].required) {
                        form += "required";
                    }
                    form += "></textarea>\n";
                }
            }
        }

        form += "</form>\n";
        forms += form;
    }

    return forms;
}

/**
 * Unscramble form data
 * @param {string} form - form data
 * @param {string} key - key to unscramble
 */
function unscramble(form, key) {
    let enc = Buffer.from(form, 'base64').toString('utf8');
    let decrypted = enc.toString('hex');

    // decrypt form data
    //let decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    //let decrypted = decipher.update(form, 'hex', 'utf8');
    //decrypted += decipher.final('utf8');
    return decrypted;
}

module.exports.start = start;
module.exports.createPage = createPage;
module.exports.imagemap = imagemap;
module.exports.forms = forms;
module.exports.unscramble = unscramble;
