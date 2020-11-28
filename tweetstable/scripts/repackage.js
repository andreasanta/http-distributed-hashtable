import GoogleSpreadsheet from 'google-spreadsheet';
import GoogleDriveCreds from './gdrive_credentials.json';
import YXMLHashtable from 'y-xmlhashtable';
import spreadSheetsIds from './spreadsheets_ids.json';


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


const basePath = './dist/tts_';
const rowsChunk = 500;
const rankChunk = 25;
const rankingSpreadsheetOffset = 2;

function unflattenTweet(row)
{

  /*
    We've been asked by Bonda to convert the created at date
    into unix time, so we parse it on the fly before writing.
  */

  return {
        "created_at": (new Date(row.createdat)).getTime(),
        "id": row.tweetid.substr(2),
        "text": row.text,
        "user": {
                "id": row.userid,
                "screen_name": row.userscreenname,
                "url": row.userurl,
                "followers_count": row.userfollowerscount,
                "friends_count": row.userfriendscount,
                "listed_count": row.userlistedcount,
                "profile_image_url": row.userprofileimageurl,
        },
        "retweet_count": row.retweetcount,
        "possibly_sensitive": row.possiblysensitive,
        "retweeted_status": row.isretweet
    };
}

for (let currentCity of Object.keys(spreadSheetsIds)) {

  // skip stubs
  if (!spreadSheetsIds[currentCity].id)
    continue;

  console.log('Processing city ' + currentCity);

  const d = new GoogleSpreadsheet(spreadSheetsIds[currentCity].id);
  const queries = spreadSheetsIds[currentCity].query;
  let currentTab = 1;

  for (let queryKey of Object.keys(queries))
  {

    console.log('And query ' + queryKey);

    let localBasePath = basePath + currentCity + queryKey + '_';

    d.useServiceAccountAuth(GoogleDriveCreds, async (err) => {

      const hash = new YXMLHashtable();
      let currentOffset = 0;
      let returnedRows;

      // loop over each row that has been approved
      do {

        let processOneChunk = new Promise((res, rej) => {
          d.getRows(currentTab, {
            offset: currentOffset,
            limit: rowsChunk,
            query: `included <> "excluded"`
          }, (err, rows) => { if (err) rej(err); else res(rows); } );
        });

        returnedRows = await processOneChunk;

        if (returnedRows.length != 0)
        {
          console.log(`retrieved batch of ${returnedRows.length} rows`);

          for (let r of returnedRows)
          {
            // console.log('retrieved row', r);
            let t = unflattenTweet(r);

            console.log(`inserting tweet id ${t.id}`);
            await hash.insert(t.user.screen_name, t);
          }
        }

        currentOffset = currentOffset + returnedRows.length;

      } while (returnedRows.length == rowsChunk);

      console.log('processed whole google sheet, writing xmls...');
      hash.saveAllBuckets(localBasePath);
      //hash.saveAllBucketsToJs(localBasePath + 'all.js', currentCity);

    });

    d.useServiceAccountAuth(GoogleDriveCreds, async (err) => {

      console.log('starting ranking processing');

      let currentOffset = 0;
      let returnedRows;
      let ranking = [];

      // loop over each row that has been approved
      do {

        let processOneChunk = new Promise((res, rej) => {
          d.getRows(currentTab + rankingSpreadsheetOffset, {
            offset: currentOffset,
            limit: rankChunk,
            query: `included <> "excluded"`
          }, (err, rows) => { if (err) rej(err); else res(rows); } );
        });

        returnedRows = await processOneChunk;

        if (returnedRows.length != 0)
        {
          console.log(`retrieved ranking batch of ${returnedRows.length} rows`);

          for (let r of returnedRows)
          {
            // console.log('retrieved row', r);
            let t = unflattenTweet(r);

            console.log(`pushing tweet id ${t.id}`);
            ranking.push(t);
          }
        }

        currentOffset = currentOffset + returnedRows.length;

      } while (returnedRows.length == rowsChunk);

      console.log('processed whole google sheet, adding ranking and writing xml');

      // the xml hashtable containing rankings is only one, it does not depend on the number of cities
      // so we have to load it each time from disk, then save it back with the new data
      let localBasePathRanking = basePath + queryKey.substr(1) + '_list_';
      const hash = new YXMLHashtable('file://' + process.cwd() + '/' + localBasePathRanking);
      await hash.loadAllBuckets();
      await hash.remove(currentCity);

      for (let r of ranking)
        await hash.insert(currentCity, r);

      hash.saveAllBuckets(localBasePathRanking);

    });
  }

  currentTab++;
}
