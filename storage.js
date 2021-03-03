/**
 * mongodb database connection
 */

const MongoClient = require("mongodb").MongoClient;
const FindRemove = require("find-remove");

/**
 * get new page object
 */
function getNewPageObject() {
    const date = new Date();
    return {
        "_id": crypto.randomUUID(),
        "created": date,
        "updated": date,
        "type": 0, // 0=start, 1=link, 2=form
        "state": 0, // 0=unrendered, 1=rendering, 2=success, 3=error
        "session": "",
        "url": "",
        "key": "",
        "formfields": {},
        "maps": [],
        "forms": []
    };
}

/**
 * connect to mongodb database
 */
async function start() {
    // connect to mongodb database
    const uri = 'mongodb://localhost:27017';
    let client = await MongoClient.connect(uri);
    let db = client.db('picidae');

    // create collection if not exists
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    if (!collectionNames.includes('pages')) {
        await db.createCollection('pages');
    }

    return client;
}

/**
 * close connection to mongodb database
 * @param {MongoClient} client - mongodb client
 */
async function close(client) {
    await client.close();
    console.log("mongodb connection closed");
}

/**
 * insert data into collection
 * @param {MongoClient} client - mongodb client
 * @param {string} piciref - picidae reference
 * @param {string} url - url to be stored
 */
async function insertPage(client, page) {
    const result = await client.db('picidae').collection('pages').insertOne(page);
}

/**
 * update data in collection
 * @param {MongoClient} client - mongodb client
 * @param {string} piciref - picidae reference
 * @param {string} url - url to be stored
 */
async function updatePage(client, page) {
    const result = await client.db('picidae').collection('pages').updateOne({ "_id": page._id }, { $set: page });
    if (result.matchedCount > 0) {
        //console.log(`Updated document with _id: ${page._id}`);
    } else {
        //console.log(`No document found with _id: ${page._id}`);
    }
}

/**
 * find data by picidae reference
 * @param {MongoClient} client - mongodb client
 * @param {string} piciref - picidae reference
 */
async function getPage(client, piciref) {
    const cursor = client.db('picidae').collection('pages').find({ "_id": piciref });
    const results = await cursor.toArray();
    if (results.length > 0) {
        //console.log(`Found document with _id: ${results[0]._id}, url: ${results[0].url}`);
        return results[0];
    } else {
        //console.log(`No document found with _id: ${piciref}`);
        return null;
    }
}

/**
 * delete all entries from collection
 * @param {MongoClient} client - mongodb client
 */
async function deleteAllPages(client) {
    const result = await client.db('picidae').collection('pages').deleteMany({});
    console.log(`Deleted ${result.deletedCount} documents`);
}

/**
 * delete all entries older than 5 minutes
 * @param {MongoClient} client - mongodb client
 */
async function deleteOldPages(client) {
    const date = new Date();
    date.setMinutes(date.getMinutes() - 5);
    const result = await client.db('picidae').collection('pages').deleteMany({ "created": { $lt: date } });
    console.log(`Deleted ${result.deletedCount} documents older than 5 minutes`);
}

/**
 * house keeping function
 * 
 * This function removes all things after the cache time is over.
 * It deletes all entries and the related images that are older than 10 minutes.
 * This function shall be called regularly.
 * 
 * @param {MongoClient} client - mongodb client
 */
async function houseKeeping() {
    // connect to data base
    let client = await start();

    // delete database entries
    const date = new Date();
    date.setMinutes(date.getMinutes() - 10);
    const result = await client.db('picidae').collection('pages').deleteMany({ "updated": { $lt: date } });
    //console.log(`Deleted ${result.deletedCount} documents older than 10 minutes`);

    // delete files
    const path = __dirname + "/pici";
    const file_result = FindRemove(path, {
        age: { seconds: 600 },
        extensions: '.png'
    });
    //console.log(`Deleted files: ${JSON.stringify(file_result)}`);
}

// make functions available for other nodejs modules
module.exports.getNewPageObject = getNewPageObject;
module.exports.start = start;
module.exports.close = close;
module.exports.insertPage = insertPage;
module.exports.getPage = getPage;
module.exports.updatePage = updatePage;
module.exports.deleteOldPages = deleteOldPages;
module.exports.deleteAllPages = deleteAllPages;
module.exports.houseKeeping = houseKeeping;
