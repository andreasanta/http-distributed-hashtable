
import Twit from 'twit';
import printf from 'printf';
import GoogleSpreadsheet from 'google-spreadsheet';
import { CognitiveServicesCredentials  } from 'ms-rest-azure';
import { ContentModeratorAPIClient }  from 'azure-cognitiveservices-contentmoderator';

// Creating the Cognitive Services credentials
// This requires a key corresponding to the service being used (i.e. text-analytics, etc)

import GoogleDriveCreds from './gdrive_credentials.json';
import spreadSheetsIds from './spreadsheets_ids.json';

// Initialize microsoft content moderator
let azureCredentials = new CognitiveServicesCredentials('50d419e330584ef781932aae680d875d');
let moderator = new ContentModeratorAPIClient(azureCredentials, "westeurope.api.cognitive.microsoft.com");

const today = new Date();
let yesterday = new Date();
yesterday.setUTCDate(today.getUTCDate() - 1);

const contestBeginningDate = '201804100000';
const startDate = printf('%04d%02d%02d0000', yesterday.getUTCFullYear(), (yesterday.getUTCMonth()+1), + yesterday.getUTCDate());
const endDate = printf('%04d%02d%02d0000', today.getUTCFullYear(), (today.getUTCMonth()+1), + today.getUTCDate());
const currentCity = 'madrid';
const tweetsChunk = 500;
const rankChunk = 25;
const disableTwitterSearch = false;
const rankingSpreadsheetOffset = 2;
let forceContinue = null; // "986018035231285248";

console.log(startDate, endDate);

function mapAndFlattenTweet(src)
{
  return {
    "created_at": src.created_at,
    "tweetid": `TW${src.id_str}`,
    "tweeturl": `https://twitter.com/statuses/${src.id_str}`,
    "isretweet": src.retweeted_status ? src.retweeted_status.id_str : 'no',
    "text": src.extended_tweet ? src.extended_tweet.full_text : src.text,
    "user_id": src.user.id,
    "user_screen_name": src.user.screen_name,
    "user_url": src.user.url,
    "user_followers_count": src.user.followers_count,
    "user_friends_count": src.user.friends_count,
    "user_listed_count": src.user.listed_count,
    "user_profile_image_url": src.user.profile_image_url,
    "retweet_count": src.retweet_count,
    "possibly_sensitive": src.possibly_sensitive,
  };
}

function rankingLoader(d, intoTab) {

  return new Promise((res, rej) => {

    console.log(`Loading ranking from sheet id ${intoTab}`);

    d.getRows(intoTab, {
      limit: rankChunk,
      query: `included <> "excluded"`,
      orderby: 'column:retweetcount',
      reverse: true
    }, (err, rows) => { if (err) rej(err); else res(rows); } );

  });

}

function rankingCleaner(d, intoTab) {
  return new Promise(async (res, rej) => {

    console.log('clearing worksheet');

    const getWorksheetsInfo = new Promise((res, rej) => {
      d.getInfo((err, info) => { if (err) rej(err); else res(info); } );
    });

    const info = await getWorksheetsInfo;
    const rankWorksheet = info.worksheets[intoTab-1];

    const resizeWorksheetOp = new Promise((res, rej) => {
      rankWorksheet.resize({
        rowCount: 1
      }, (err, rows) => { if (err) rej(err); else res(rows); } );
    });

    await resizeWorksheetOp;
/*
    const getFirstLineOfCells = new Promise((res, rej) => {
      rankWorksheet.getCells({
        'min-row': 2,
        'max-row': 2,
        'min-col': 1,
        'max-col': rankWorksheet.colCount,
        'return-empty': true
      }, (err, rows) => { if (err) rej(err); else res(rows); } );
    });

    const firstLineCells = await getFirstLineOfCells;

    for (let cell of firstLineCells)
    {
      const delCell = new Promise((res, rej) => {
        cell.del((err) => { if (err) rej(err); else res(); });
      });

      await delCell;
    } */

    res();

  });
}

async function rankingInsert(d, rankingList, intoTab) {
  for (let r of rankingList)
  {
    // remove conflicting keys from original row, otherwise
    // google drive will not add id back
    ['_xml', '_id', '_links', 'app:edited', 'del', 'save'].forEach((prop) => delete r[prop]);

    const addRowOp = new Promise((res, rej) => {
      d.addRow(intoTab, r, (err, row) => { if (err) rej(err); else res(row); });
    });

    //console.log('adding row', r);

    await addRowOp;

    console.log(`Ranking added tweet ${r.tweetid} with retweets ${r.retweetcount}`);
  }
}

async function processPostQuery(d, localCurrentTab, currentCity, queryKey)
{
  const rankingTabId = localCurrentTab + rankingSpreadsheetOffset;

  const rankingList = await rankingLoader(d, localCurrentTab);

  console.log('cleaning ranking from spreadsheet ' + rankingTabId);
  await rankingCleaner(d, rankingTabId);

  console.log(`Got ranking for ${currentCity} - ${queryKey}, total length = ${rankingList.length}`);
  console.log('Inserting ranking into spreadsheet ' + rankingTabId);
  await rankingInsert(d, rankingList, rankingTabId);
}

async function processQuery(d, currentCity, queryKey, query, localCurrentTab)
{
  return new Promise((res, rej) => {

    d.useServiceAccountAuth(GoogleDriveCreds, async (err) => {

      if (err)
      {
        console.error(err);
        rej(err);
      }

      const loaderCallback = async (err, data, response) => {

        console.log('LOCAL current tab', localCurrentTab);

        if (err)
        {
          console.log(err);
          rej(err);
        }

        console.log(data);
        if (data.results)
        {
          console.log(`Retrieved ${data.results.length} tweets`);
          for (let s of data.results)
          {
            const m = mapAndFlattenTweet(s);
            let sensitive = false;

            // check for profanity
            const screenText = new Promise((res, rej) => {

              moderator.textModeration.screenText('spa', 'text/plain', s.text, (err, result, request, response) => {
                if (err) rej(err);

                console.log(result);

                // terms found are potentially offensive
                m.possibly_sensitive = m.possibly_sensitive || (result.terms && result.terms.length != 0);
                res(m.possibly_sensitive);
              });
            });

            const screeningResult = await screenText;

            const search = new Promise((res, rej) => {
              d.getRows(localCurrentTab, {
                limit: 1,
                query: `tweetid = "${m.tweetid}"`
              }, (err, rows) => { if (err) rej(err); else res(rows); } );
            });

            const searchResult = await search;
            let row;

            if (searchResult.length != 0)
            {
              row = searchResult[0];
              for (let k of Object.keys(m)) row[k] = m[k];
              row.updated_at = new Date();

              while (1) {
                try {
                  await row.save();
                } catch (e) {
                  console.error(e);
                }
                break;
              }
            }
            else {

              // if sensitive, pre-flag as excluded when inserting the first time
              if (m.possibly_sensitive)
                m['included'] = 'excluded';

              const addRowOp = new Promise((res, rej) => {
                d.addRow(localCurrentTab, m, (err, row) => { if (err) rej(err); else res(row); });
              });


              while (1) {
                try {
                  row = await addRowOp;
                } catch (e) {
                  console.error(e);
                }
                break;
              }
            }

            if (row)
              console.log('added tweet ' + m.tweetid);
          }
        }
        else {
          console.error('no tweets found!!!');
          res();
        }
      /*
        search_metadata:
          { completed_in: 0.086,
            max_id: 986031480626384900,
            max_id_str: '986031480626384896',
            next_results: '?max_id=986031200815984639&q=%23trump%20since%3A2018-04-16%20until%3A2018-04-17&count=100&include_entities=1',
            query: '%23trump+since%3A2018-04-16+until%3A2018-04-17',
            refresh_url: '?since_id=986031480626384896&q=%23trump%20since%3A2018-04-16%20until%3A2018-04-17&include_entities=1',
            count: 100,
            since_id: 0,
            since_id_str: '0' } }
      */
        if (data.next)
        {
          forceContinue = data.next;
          console.log('next page token ' + forceContinue);
          t.post('tweets/search/30day/staging', {
            query: query,
            maxResults: tweetsChunk,
            fromDate: startDate,
            toDate: endDate,
            next: forceContinue }, loaderCallback);
        }
        else {
          forceContinue = null;
          await processPostQuery(d, localCurrentTab, currentCity, queryKey);
          res();
        }
      };

      // perform search, if not disabled
      if (!disableTwitterSearch)
      {
        if (forceContinue)
          t.post('tweets/search/30day/staging', {
            query: query,
            maxResults: tweetsChunk,
            fromDate: startDate,
            toDate: endDate,
            next: forceContinue }, loaderCallback);
        else
          t.post('tweets/search/30day/staging', {
            query: query,
            maxResults: tweetsChunk,
            fromDate: startDate,
            toDate: endDate }, loaderCallback);
      }
      else
      {
        console.warn('skipping twitter search as instructed');
        await processPostQuery(d, localCurrentTab, currentCity, queryKey);
        res();
      }

    }); // google credentials
  }); // promise
} // func


// initialize main twitter object
const t = new Twit({
  consumer_key:         'yHE6omEh8OA5DurzDy5T7GfGu',
  consumer_secret:      'fYpp6lh3eG1bUahnEiqkiWjOT6irbnGbnzvzdvmG2gR0MHihIU',
  app_only_auth:        true
});

// initialize content filtering apis
async function mainLoop() {

  for (let currentCity of Object.keys(spreadSheetsIds)) {

    // skip stubs
    if (!spreadSheetsIds[currentCity].id)
      continue;

    const d = new GoogleSpreadsheet(spreadSheetsIds[currentCity].id);
    const queries = spreadSheetsIds[currentCity].query;

    // tab 1 = _ticket, tab 2 = _noticket
    let currentTab = 1;

    for (let queryKey of Object.keys(queries))
    {
      const query = queries[queryKey];
      console.log(`Fetching city ${currentCity} with query ${queryKey} => ${query}`);
      await processQuery(d, currentCity, queryKey, query, currentTab++);
    }
  }
}

mainLoop();
