/**
 * Pici Server with 'express' framework
 * 
 * This is the nodejs implementation of the pici-server
 */
const express = require("express");
const path = require("path");
const fs = require('fs')
const crypto = require("crypto");
const pici = require("./pici-engine");
const pagegenerator = require("./pagegenerator");
const storage = require("./storage");
const { ClientSession } = require("mongodb");

const hostname = "127.0.0.1";
const port = 3000;
const app = express();

// schedule cache cleaning every minute
setInterval(() => {
    storage.houseKeeping()
    }, 60000);

// picidae images
app.use('/img', express.static(path.join(__dirname, 'pici')));
// static content
app.use('/static', express.static(path.join(__dirname, 'static')));
// info page
app.get('/p', async (req, res) => {
    // connect to data base
    let client = await storage.start();

    // get info page
    let html = fs.readFileSync('templates/info.html', {encoding: 'utf8'});
    
    res.send(html);
});


// dynamic content
app.get('/', async( req, res) =>{
    let r = req.query.r;

    // connect to data base
    let client = await storage.start();
    
    // start page
    if (r === undefined) {
        let html = await pagegenerator.start(client);
        res.send(html);
    }
    // invoke url via reference
    else {
        // get page
        let html = "";
        // get page from data base
        let page = await storage.getPage(client, r);
        //console.log(`page: ${JSON.stringify(page)}`);
        if (page === undefined || page === null) {
            console.log("page not found");
            html = fs.readFileSync('templates/404.html', {encoding: 'utf8'});
        } else if(page.type === 0) {
            // start page
            let f = req.query.f;

            let enc = Buffer.from(f, 'base64').toString('utf8');
            let url = enc.toString('hex');
            //console.log(`form URL: ${url}`);

            // create page
            page.url = url;
            html = await pagegenerator.createPage(client, page);
        } else if(page.type === 1) {
            // link page

            // create page
            html = await pagegenerator.createPage(client, page);

        } else if(page.type === 2) {
            // form page
            // get form data
            let form = page.formfields;
            let sendValues = [];
            for (i = 0; i < form.inputs.length; i++) {
                if (form.inputs[i].tag === "input") {
                    if (form.inputs[i].type === "hidden") {
                        if (form.inputs[i].checked) {
                            sendValues.push({
                                key: form.inputs[i].name,
                                value: form.inputs[i].value
                            });
                        }
                    } else {
                        let value = req.query[i];
                        if (value !== undefined) {
                            let toSend = null;
                            if (form.inputs[i].type === "submit") {
                                sendValues.push({
                                    key: form.inputs[i].name,
                                    value: form.inputs[i].value
                                });
                            } else {
                                // unscramble value
                                unscrambled = pagegenerator.unscramble(value, page.key);
                                //console.log(`unscrambled: ${unscrambled}, scrambled: ${value}`);

                                sendValues.push({
                                    key: form.inputs[i].name,
                                    value: unscrambled
                                });
                            }
                        }
                    }
                } else if (form.inputs[i].tag === "textarea") {
                    
                    let value = req.query[i];
                    if (value !== undefined) {
                        // unscramble value
                        unscrambled = pagegenerator.unscramble(value, page.key);
                        //console.log(`unscrambled: ${unscrambled}, scrambled: ${value}`);

                        // add it to fields
                        sendValues.push({
                            key: form.inputs[i].name,
                            value: unscrambled
                        });
                    }
                }
            }

            // create URL
            let url = form.action;
            for (i = 0; i < sendValues.length; i++) {
                let key = sendValues[i].key;
                let value = sendValues[i].value;
                if (i === 0) {
                    url += "?";
                } else {
                    url += "&";
                }
                url += key + "=" + value;
            }

            // create page
            page.url = url;
            html = await pagegenerator.createPage(client, page);
        }

        res.send(html);
    }
});

// start server
var server=app.listen(port, function() {
    console.log(`Server running at http://${hostname}:${port}/`);
});
