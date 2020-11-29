import { expect, assert } from 'chai';
import fg from 'fast-glob';
import fsx from 'fs-extra';


import YXMLHashtable from '..';

// hack to initialize jquery
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const dom = new JSDOM(`<!DOCTYPE html><p>Hello world</p>`,
  {
      url: 'file://./test/test.html',
      contentType: "text/html",
      userAgent: "node.js",
      includeNodeLocations: true
  });
global.$ = require('jquery')(dom.window);

let sampleTweet = {
                    "created_at": "Sun Feb 25 18:11:01 +0000 2018",
                    "id": 967824267948773377,
                    // "id_str": "967824267948773377",
                    "text": "From pilot to astronaut, Robert H. Lawrence was the first African-American to be selected as an astronaut by any na… https://t.co/FjPEWnh804",
                    //"truncated": true,
                  //  "metadata": {
                    //        "result_type": "popular",
                    //        "iso_language_code": "en"
                  //  },
                  //  "source": "<a href=\"https://www.sprinklr.com\" rel=\"nofollow\">Sprinklr</a>",
                    "user": {
                            "id": 11348282,
                        //    "id_str": "11348282",
                        //    "name": "NASA",
                            "screen_name": "NASA",
                        //    "location": "",
                        //    "description": "Explore the universe and discover our home planet with @NASA. We usually post in EST (UTC-5)",
                            "url": "https://t.co/TcEE6NS8nD",
                        //    "entities": {},
                        //    "protected": false,
                            "followers_count": 28605561,
                            "friends_count": 270,
                            "listed_count": 90405,
                        //    "created_at": "Wed Dec 19 20:20:32 +0000 2007",
                        //    "favourites_count": 2960,
                        //    "utc_offset": -18000,
                        //    "time_zone": "Eastern Time (US & Canada)",
                        //    "geo_enabled": false,
                        //    "verified": true,
                        //    "statuses_count": 50713,
                        //    "lang": "en",
                            "profile_image_url": "http://pbs.twimg.com/profile_images/188302352/nasalogo_twitter_normal.jpg",
                        //    "profile_image_url_https": "https://pbs.twimg.com/profile_images/188302352/nasalogo_twitter_normal.jpg",
                        //    "profile_banner_url": "https://pbs.twimg.com/profile_banners/11348282/1518798395",
                    },
                    //"geo": null,
                    //"coordinates": null,
                    //"place": null,
                    //"contributors": null,
                    //"is_quote_status": false,
                    "retweet_count": 988,
                    //"favorite_count": 3875,
                    //"favorited": false,
                    //"retweeted": false,
                    //"possibly_sensitive": false,
                    //"lang": "en"
            };


describe('constructor()', function () {
  it('should build a basic empty hashtable', function () {

    let hash = new YXMLHashtable();

  });
});

describe('insert()', function () {
  it('should insert a new object', async function () {

    let hash = new YXMLHashtable();

    await hash.insert('key', 'value');

    assert.equal(hash.count(), 1);

  });

  it('should insert two new objects in the same key', async function () {

    let hash = new YXMLHashtable();

     await hash.insert('key', 'value');
     await hash.insert('key', 'value2');

     assert.equal(hash.count(), 2);

  });

  it('should insert two new objects in different keys', async function () {

    let hash = new YXMLHashtable();

     await hash.insert('key1', 'value1');
     await hash.insert('key2', 'value2');

    assert.equal(hash.count(), 2);

  });
});


describe('saveAllBuckets()', function () {

  it('should generate one js file with 1 export per bucket (50k basic objects)', async function () {

    let hash = new YXMLHashtable();

    for (let i = 0; i < 50000; ++i)
      await hash.insert('key' + i, {objectKey: 'value' + i}, true);

    return new Promise((res, rej) => {

      fsx.removeSync('./xmlhashtable/test/out/test_data.js');

      hash.saveAllBucketsToJs('./xmlhashtable/test/out/test_data.js', 'test_table');

      res();
    });

  });


  it('should generate one js file with 100k basic tweets', async function () {

    let hash = new YXMLHashtable();

    fsx.removeSync('./xmlhashtable/test/out/test_tweets_data_100k.js');

    for (let i = 0; i < 100000; ++i)
    {
      sampleTweet.user.screen_name = Math.random().toString(36).substr(2, 16);
      await hash.insert(sampleTweet.user.screen_name, sampleTweet);
    }

    return new Promise((res, rej) => {
        hash.saveAllBucketsToJs('./xmlhashtable/test/out/test_tweets_data_100k.js', 'test_tweets');

        res();
    });

  });

  it('should generate one js file with 250k basic tweets', async function () {

    let hash = new YXMLHashtable();

    fsx.removeSync('./xmlhashtable/test/out/test_tweets_data_250k.js');

    for (let i = 0; i < 250000; ++i)
    {
      sampleTweet.user.screen_name = Math.random().toString(36).substr(2, 16);
      await hash.insert(sampleTweet.user.screen_name, sampleTweet);
    }

    return new Promise((res, rej) => {
        hash.saveAllBucketsToJs('./xmlhashtable/test/out/test_tweets_data_250k.js', 'test_tweets');

        res();
    });

  });

  it('should generate one js file with 500k basic tweets', async function () {

    let hash = new YXMLHashtable();

    fsx.removeSync('./xmlhashtable/test/out/test_tweets_data_500k.js');

    for (let i = 0; i < 500000; ++i)
    {
      sampleTweet.user.screen_name = Math.random().toString(36).substr(2, 16);
      await hash.insert(sampleTweet.user.screen_name, sampleTweet);
    }

    return new Promise((res, rej) => {
        hash.saveAllBucketsToJs('./xmlhashtable/test/out/test_tweets_data_500k.js', 'test_tweets');

        res();
    });

  });

  it('should generate one js file with 1M basic tweets', async function () {

    let hash = new YXMLHashtable();

    fsx.removeSync('./xmlhashtable/test/out/test_tweets_data_1M.js');

    for (let i = 0; i < 1000000; ++i)
    {
      sampleTweet.user.screen_name = Math.random().toString(36).substr(2, 16);
      await hash.insert(sampleTweet.user.screen_name, sampleTweet);
    }

    return new Promise((res, rej) => {
        hash.saveAllBucketsToJs('./xmlhashtable/test/out/test_tweets_data_1M.js', 'test_tweets');

        res();
    });

  });

});


  it('should generate XML files per each bucket (50k basic objects)', async function () {

    let hash = new YXMLHashtable();

    for (let i = 0; i < 50000; ++i)
      await hash.insert('key' + i, {objectKey: 'value' + i}, true);

    console.log(hash.countItemsPerBucket());

    fsx.emptyDirSync('./xmlhashtable/test/out');

    hash.saveAllBuckets('./xmlhashtable/test/out/test_');

    // count written files
    let countFiles = fg.sync(['./xmlhashtable/test/out/test_*.xml']).length;
    console.log('counted files ' + countFiles);


    expect(hash.countLoadedBuckets()).to.equal(countFiles);

  });


  it('should generate XML files per each bucket (1k basic tweets)', async function () {

    let hash = new YXMLHashtable();


    for (let i = 0; i < 1000; ++i)
    {
      sampleTweet.user.screen_name = Math.random().toString(36).substr(2, 16);
      await hash.insert(sampleTweet.user.screen_name, sampleTweet);
    }

    console.log(hash.countItemsPerBucket());

    fsx.emptyDirSync('./xmlhashtable/test/out');

    hash.saveAllBuckets('./xmlhashtable/test/out/test_tweets_');

    // count written files
    let countFiles = fg.sync(['./xmlhashtable/test/out/test_tweets_*.xml']).length;
    console.log('counted files ' + countFiles);

    expect(hash.countLoadedBuckets()).to.equal(countFiles);

});


describe('constructor()', function (done) {
  it('should load hashtable from disk', function (done) {

    let hash = new YXMLHashtable('file://' + __dirname + '/out/test_tweets_');
    //let hash = new YXMLHashtable('http://images.samsung.com/is/content/samsung/p5/es/test/test_tweets_');

    hash.loadAllBuckets()
        .then(function () { done() });

  });
});

describe('countLoadedBuckets()', function () {
  it('should return the number of actually loaded buckets, no buckets', function () {

    let hash = new YXMLHashtable();

    expect(hash.countLoadedBuckets()).to.equal(0);

  });
});

describe('loadRandomBucket()', function () {
  it('should load three random buckets from disk', function () {

    let hash = new YXMLHashtable('file://' + __dirname + '/out/test_tweets_');

    let b1 = hash.loadRandomBucket();
    let b2 = hash.loadRandomBucket();
    let b3 = hash.loadRandomBucket();

    Promise.all([b1, b2, b3]).then(() => {
      expect(hash.countLoadedBuckets()).to.equal(3);
    });

  });
});

describe('*loadedBuckets()', function () {
  it('should load three random buckets from disk and cycle through them sequentially', function () {

    let hash = new YXMLHashtable('file://' + __dirname + '/out/test_tweets_');

    hash.loadRandomBucket();
    hash.loadRandomBucket();
    hash.loadRandomBucket();

    for (let b of hash.loadedBuckets())
      expect(b).not.to.equal(undefined);

  });
});

describe('*randomLoadedBuckets()', function () {
  it('should load three random buckets from disk and cycle through them randomly', function () {

    let hash = new YXMLHashtable('file://' + __dirname + '/out/test_tweets_');

    hash.loadRandomBucket();
    hash.loadRandomBucket();
    hash.loadRandomBucket();

    for (let b of hash.randomLoadedBuckets())
      expect(b).not.to.equal(undefined);

  });
});

describe('retrieveRandom()', function () {

  it ('should return zero items', async () => {
    let hash = new YXMLHashtable();
    let retrieved = await hash.retrieveRandom(10);

    expect(retrieved.length).to.equal(0);
  });

  it ('should return 1 item',  async () => {
    let hash = new YXMLHashtable('file://' + __dirname + '/out/test_tweets_');
    let retrieved = await hash.retrieveRandom(1);

    expect(retrieved.length).to.equal(1);
  });

  it ('should return 12 item', async () => {
    let hash = new YXMLHashtable('file://' + __dirname + '/out/test_tweets_');
    let retrieved = await hash.retrieveRandom(12);

    expect(retrieved.length).to.equal(12);
  });

  it ('should return 10 items from pre-loaded buckets', async () => {

    let hash = new YXMLHashtable('file://' + __dirname + '/out/test_tweets_', 25);
    hash.loadAllBuckets();

    let retrieved = await hash.retrieveRandom(10);

    expect(retrieved.length).to.equal(10);
  });

  it ('should return 258 items from pre-loaded buckets', async () => {

    let hash = new YXMLHashtable('file://' + __dirname + '/out/test_tweets_');
    hash.loadAllBuckets();

    let retrieved = await hash.retrieveRandom(258);

    expect(retrieved.length).to.equal(258);
  });

  it ('should attempt to get 1500 items from pre-loaded buckets, but starves at 1000 on purpose', async () => {

    let hash = new YXMLHashtable('file://' + __dirname + '/out/test_tweets_');
    hash.loadAllBuckets();

    let retrieved = await hash.retrieveRandom(1500);

    expect(retrieved.length).to.be.at.most(1000);
  });
});
