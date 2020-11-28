# Twitter hashtables

This package allows to load in the browser multiple read-only hashtables that are phisically stored on the front-end server as .XML files. It's basically a read-only hashtable distributed over different front-end files.

It is thought to quickly load medium sized amounts of data in a constant time, without overloading the browser memory.

## Installation

At the moment this package is not yet available on npm, so it must be copied an imported manually.

## Getting started with hashtables

All the tables are loaded from a base URL path which should be provided on instantiation, like this

```javascript
import YTweetsTable from 'tweetstable'

// Tell the object where to find all the tables
let table = new YTweetsTable('http://domain.com/base');

```
In case you do not have a base URL setup yet, you can use the _debug_ option in order to load dummy data, as follows:

```javascript
import YTweetsTable from 'tweetstable'

// Tell the object to load debug data
let table = new YTweetsTable('', true);

```

Once the object has been successifully initialized, you can load hashtables by name and type, for instance:

```javascript
import YTweetsTable from 'tweetstable'

// Tell the object to load hashtable named "madrid", with tipe "TYPE_FACETOFACE"
// Please note the same table name with different type, will load a different table
let hashtable = table.loadNamedTable('madrid', YTweetsTable.TYPE_FACETOFACE);

```
At the moment only the following types are supported
* YTweetsTable.TYPE_FACETOFACE
* YTweetsTable.TYPE_NOTICKET

### Retrieving key values

Once a hashtable has been loaded, you can query it in two different ways.

First you can retrieve a specific element in the hashtable:
```javascript
hasthable.retrieve('key')
          .then((v) => console.log(v));
          // Please note v is always an array!
```

The above asynchronous call will search for the specified key in the hashtable and will return an array of zero or more elements, according to the contents of the hashtable.

Besides retrieving a specific key, you can also ask the hashtable to provide a random number of object spread through the dataset. The hashtable will do its best to provide all the objects it can in the least possible time.

```javascript
let numberOfElementsToRetrieve = 100;
hashtable.retrieveRandom(numberOfElementsToRetrieve)
        .then((a) => console.log(a));
        // please note a is always an array!
```
In case the hashtable does not contain enough elements in order to satisfy the requested number, it will provide as much as it can.

### Checking whether a hashtable is available

If you need to check whether a hashtable is available for loading, before performing the load, you can perform a pre-flight request with this function:

```javascript
  table.isTableAvailable('malaga', YTweetsTable.TYPE_FACETOFACE)
    .then(() => console.log('found!'), () => console.log('not found!'));
    // note the promise is rejected if the table is not available yet
```

## Getting started with lists
This special module also allows to retrieve named lists, which are basically arrays indexed by a key and a type.

This functionality can be used in order retrieve the ranking of tweets of a specific city in the following way:

```javascript
table.loadNamedList('bilbao', YTweetsTable.TYPE_NOTICKET )
    .then((l) => console.log(l));
    // remember "l" is always an array, even if empty
```

### Checking whether a list is available

If you need to check whether a list is available for loading, before performing the load, you can perform a pre-flight request with this function:

```javascript
  table.isListAvailable('madrid', YTweetsTable.TYPE_FACETOFACE)
    .then(() => console.log('found!'), () => console.log('not found!'));
    // note the promise is rejected if the list is not available yet
```

## Common tweet format

Both tables and lists will contain items with info on the tweets to display. Each item will be a JavaScript object with the following fields:

```json
{
  "created_at": "Sun Feb 25 18:11:01 +0000 2018",
  "id": 967824267948773377,
  "id_str": "967824267948773377",
  "text": "From pilot to astronaut, Robert H. Lawrence was the first African-American to be selected as an astronaut by any na… https://t.co/FjPEWnh804",
  "truncated": true,
  "metadata": {
          "result_type": "popular",
          "iso_language_code": "en"
  },
  "source": "<a href=\"https://www.sprinklr.com\" rel=\"nofollow\">Sprinklr</a>",
  "user": {
          "id": 11348282,
          "id_str": "11348282",
          "name": "NASA",
          "screen_name": "NASA",
          "location": "",
          "description": "Explore the universe and discover our home planet with @NASA. We usually post in EST (UTC-5)",
          "url": "https://t.co/TcEE6NS8nD",
          "entities": {},
          "protected": false,
          "followers_count": 28605561,
          "friends_count": 270,
          "listed_count": 90405,
          "created_at": "Wed Dec 19 20:20:32 +0000 2007",
          "favourites_count": 2960,
          "utc_offset": -18000,
          "time_zone": "Eastern Time (US & Canada)",
          "geo_enabled": false,
          "verified": true,
          "statuses_count": 50713,
          "lang": "en",
          "profile_image_url": "http://pbs.twimg.com/profile_images/188302352/nasalogo_twitter_normal.jpg",
          "profile_image_url_https": "https://pbs.twimg.com/profile_images/188302352/nasalogo_twitter_normal.jpg",
          "profile_banner_url": "https://pbs.twimg.com/profile_banners/11348282/1518798395",
  },
  "geo": null,
  "coordinates": null,
  "place": null,
  "contributors": null,
  "is_quote_status": false,
  "retweet_count": 988,
  "favorite_count": 3875,
  "favorited": false,
  "retweeted": false,
  "possibly_sensitive": false,
  "lang": "en"
}
```
TODO:
 - Evaluate the possibility of simplifying the tweet object, in order to reduce the physical space and transfer time for each table.
