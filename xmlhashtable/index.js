"use strict";

import SparkMD5 from 'spark-md5';
import XMLWriter from 'xml-writer';
import fs from 'fs';
import _ from 'lodash';
import LZString from 'lz-string';


class YXMLHashtable {
  constructor(basePath, size = 256) {
    this._basePath = basePath;
    this._buckets = size;
    this.clear();
  }

  hashFunc(str) {
    const hex = SparkMD5.hash(str);
    const number = parseInt(hex.substr(0, 8), 16);
    const index = (number) % this._buckets;
    return index;
  }

  parseBucket(result) {
    // we retrieve a simple list of key - object value
    // each key might have more than one object, so we build
    // a linked list inside a javascript object
    const buckObject = {};

    // root object, we skip it, doesnt matter the name
    const $xml = $(result);

    // DOM -> r -> i
    $xml.children().children().each((i, v) => {
      const children = $(v).children();
      const key = $(children[0]).text();
      const value = $(children[1]);

      // console.log(`${key} => ${value.text()}`);

      // always overwrite key, doesnt matter
      buckObject[key] = JSON.parse(value.text());
    });

    return buckObject;
  }

  loadBucket(index, skipLoad = false) {

    if (!skipLoad) console.log(`LOADING BUCKET ${index} ...`);
    const startTime = new Date().getTime();

    return new Promise((res, rej) => {

      let bucket = this._storage[index];
      // console.log('loading bucket ' + index);
      // does a bucket exist or do we get undefined when trying to retrieve said index?
      if (!bucket) {

        // if we're not asked to load, return brand new bucket
        if (skipLoad)
        {
          this._storage[index] = {};
          return res(this._storage[index]);
        }

        // load the bucket from base path
        const url = `${this._basePath + index}.xml`;

        // bail on file ! exists
        if (url.indexOf('file://') != -1 && !fs.existsSync(url.substr(7)))
        {
          console.log(`${url} file not found`);
          this._storage[index] = {};
          return res(this._storage[index]);
        }

        try {
          $.ajax({
            type: 'GET',
            url,
            dataType: 'xml',
            success: (result) => {
              // actual bucket load
              bucket = this.parseBucket(result);
              if (bucket) {
                this._storage[index] = bucket;
                res(this._storage[index]);
                console.log(`LOADED BUCKET ${index} in ${new Date().getTime() - startTime} ms`);
              } else {
                console.warn('unable to load bucket');
                this._storage[index] = {};
                res(this._storage[index]);
              }
            },
            error: (xhr, status, err) => {
              console.error('File fetch failed!', status);
              this._storage[index] = {};
              res(this._storage[index]);
            }
          });
        } catch (e) {
          console.error('File fetch failed!', status);
          this._storage[index] = {};
          res(this._storage[index]);
        }
      }
      else {
        if (!skipLoad) console.log(`RETURNED BUCKET ${index} in ${new Date().getTime() - startTime} ms`);
        res(bucket);
      }

    });
  }

  getRandomBucket() {
    return this._storage[Math.random() * this._buckets << 0];
  }

  loadRandomBucket() {
    return new Promise((res, rej) => {
      // no more buckets to load
      if (this.countLoadedBuckets() == this._buckets)
        return res(this.getRandomBucket());

      let randomKey = 0;
      do {
        randomKey = Math.random() * this._buckets << 0;
      } while (this._storage[randomKey] !== undefined)

      this.loadBucket(randomKey).then((r) => { res(r); });
    });
  }

  loadAllBuckets() {

    let promises = [];
    for (let i = 0; i < this._buckets; ++i) {
      promises.push(this.loadBucket(i));
    }

    return Promise.all(promises);
  }

  * loadedBuckets() {
    for (const b of this._storage) {
      if (b) { yield b; }
    }
  }

  * randomLoadedBuckets() {

    let loaded = [];
    let randomKey;
    let loadedBucketsCount = this.countLoadedBuckets();

    if (loadedBucketsCount == 0)
      return;

    for (let i = 0; i < loadedBucketsCount; ++i)
    {
      do {
        randomKey = Math.random() * this._buckets << 0;
      } while(loaded.indexOf(randomKey) != -1 ||
              this._storage[randomKey] == undefined);

      loaded.push(randomKey);
      console.log('yielding bucket with randomKey ' + randomKey);
      yield this._storage[randomKey];
    }
  }

  // SYNC METHOD, don't call on main thread
  saveAllBuckets(localBasePath) {
    for (let i = 0; i < this._buckets; ++i) {
      const bucket = this._storage[i];

      if (bucket === undefined || Object.keys(bucket).length == 0) {
        continue;
      }

      const fd = fs.openSync(`${localBasePath + i}.xml`, 'w');
      const xw = new XMLWriter(false, (string, enc) => { fs.appendFileSync(fd, string, {encoding: enc}); });

      xw.startDocument('1.0', 'UTF-8');
      const root = xw.startElement('r');


      for (const k in bucket) {
        const value = bucket[k];
        // console.log('iteration', i, value);
        if (value) {
          root.startElement('i')
            .writeElement('k', k)
            .startElement('v')
            .writeCData(JSON.stringify(value))
            .endElement('v')
            .endElement('i');
        }
      }

      root.endElement('r');
      fs.closeSync(fd);
      if (global.gc) { global.gc(); }
    }
  }

  saveAllBucketsToJs(localFileName, tableName) {
    const fd = fs.openSync(localFileName, 'a');

    for (let i = 0; i < this._buckets; ++i) {
      const bucket = this._storage[i];

      if (bucket === undefined || Object.keys(bucket).length == 0) {
        continue;
      }

      // compress value, first with JSONC then with lzjs
      const uncompressedJson = JSON.stringify(bucket);

      //console.log('compressing json for bucket ' + i);
      //const compressedJson = JSONC.compress(bucket);

      console.log('compressing string for bucket ' + i);
      const zippedJson = LZString.compress(uncompressedJson);

      const compressionRatio = (100 - ((zippedJson.length / uncompressedJson.length) * 100)).toFixed(2);
      console.log(`bucket ${i} compression ratio of ${zippedJson.length} over ${uncompressedJson.length} = ${compressionRatio}`);

      const javascriptVariable = `module.exports['ht_${tableName}_${i}'] = "${zippedJson}";\n`;

      fs.appendFileSync(fd, javascriptVariable, {encoding: 'utf-8'});
    }

    fs.closeSync(fd);
  }

  async insert(key, value) {
    // create an index for our storage location by passing it through our hashing function
    const index = this.hashFunc(key);

    // retrieve the bucket at this particular index in our storage, if one exists
    const bucket = await this.loadBucket(index, true);
    //console.log('retrieved bucket', bucket);

    const bucketList = bucket[key];
    if (bucketList === undefined) {
      //console.log('adding key and value');
      bucket[key] = [value];
    } else {
      //console.log('pushing key and value');
      bucketList.push(value);
    }
  }

  async remove(key)
  {
    // create an index for our storage location by passing it through our hashing function
    const index = this.hashFunc(key);

    // retrieve the bucket at this particular index in our storage, if one exists
    const bucket = await this.loadBucket(index, true);
    //console.log('retrieved bucket', bucket);

    const bucketList = bucket[key];
    if (bucketList === undefined) {
      //console.log('adding key and value');
      return;
    } else {
      //console.log('pushing key and value');
      delete bucket[key];
      this._storage[index] = bucket;
    }
  }

  retrieve(key, skipLoad = false) {

    console.log(`FETCHING KEY ${key} ...`);
    const startTime = new Date().getTime();

    return new Promise((res, rej) => {
      // create an index for our storage location by passing it through our hashing function
      const index = this.hashFunc(key);

      // retrieve the bucket at this particular index in our storage, if one exists
      this.loadBucket(index, skipLoad).then((bucket) => {

        const bucketList = bucket[key];
        if (bucketList === undefined) {
          console.log(`FETCHED KEY ${key} in ${new Date().getTime() - startTime} ms`);
          return res([]);
        }

        console.log(`FETCHED KEY ${key} in ${new Date().getTime() - startTime} ms`);
        return res(bucketList);
      });
    });
  }

  // retrieve a random number of objects from loaded buckets
  // if no buckets are loaded, load a random one and retrieve
  // objects from there
  retrieveRandom(cnt) {

    return new Promise((res, rej) => {

      let retrieved = [];
      let loadedBucketsCount = this.countLoadedBuckets();

      console.log('preloaded buckets = ' + loadedBucketsCount);

      // we try and extract per each bucket twice as mush the average, to
      // account for difference in hashtable balance (different # of elements per bucket)
      const averagePerBucket = loadedBucketsCount && cnt >= loadedBucketsCount ? (cnt / loadedBucketsCount << 1) : cnt;

      console.log('avg x bucket = ' + averagePerBucket);

      // first attempt loaded buckets
      for (const b of this.randomLoadedBuckets()) {

        if (Object.keys(b).length == 0)
        {
          console.log('empty object bucket!');
          continue;
        }

        let currentBucketCount = 0;
        const currentBucketCopy = _.cloneDeep(b, true);
        const currentBucketSize = Object.keys(currentBucketCopy).length;

        // cycle over current bucket until found at least average per bucket elements
        while (Object.keys(currentBucketCopy).length != 0
                && currentBucketCount++ < averagePerBucket
                && retrieved.length < cnt
        ) {
          const keys = Object.keys(currentBucketCopy);

          console.log('current amount of keys ' + keys.length);

          const randomKey = keys[keys.length * Math.random() << 0];
          const randomObject = currentBucketCopy[randomKey];

          if (randomObject.length == 1) {
            console.log('A) fetching first object from bucket key ' + randomKey);
            retrieved.push(randomObject[0]);
          } else {
            console.log('A) fetching one random object from bucket key ' + randomKey);
            retrieved.push(randomObject[randomObject.length * Math.random() << 0]);
          }

          delete currentBucketCopy[randomKey];

          // check after each bucket if we reached the expected count
          console.log('retrieved so far ' + retrieved.length);

        }

        if (retrieved.length == cnt) {
          console.log('total searched buckets ' + currentBucketCount);
          return res(retrieved);
        }
      }

      console.log('not enough random objects found in pre-loeaded buckets, loading more random ones');

      var localLoader = (bucket) => {

        ++loadedBucketsCount;
        console.log('loaded random bucket / ' + loadedBucketsCount + ` items ${Object.keys(bucket).length}`);

        // load all possible keys from bucket, if more items in one key, load random one
        for (let k of Object.keys(bucket))
        {
          let v = bucket[k];
          if (v.length == 1) {
            console.log('B) fetching first object from bucket key ' + k);
            retrieved.push(v[0]);
          } else {
            console.log('B) fetching one random object from bucket key ' + k);
            retrieved.push(v[v.length * Math.random() << 0]);
          }

          if (retrieved.length == cnt) { return res(retrieved); }
        }

        if (retrieved.length < cnt && loadedBucketsCount < this._buckets)
          return this.loadRandomBucket().then(localLoader);
        else if (retrieved.length < cnt)
          console.warn('returned less items than requested, not enough random items found!');


        res(retrieved);
      }


      // if we end up here, we didn't manage to get enough elements,
      // so keep loading random buckets untill we fill in our quota

      console.log('loading first random bucket');
      this.loadRandomBucket().then(localLoader);

    });
  }

  countLoadedBuckets() {
    let total = 0;
    for (let i = 0; i < this._buckets; ++i) {
      if (this._storage[i]) { ++total; }
    }

    return total;
  }

  count() {
    let sum = 0;
    for (let i = 0; i < this._buckets; ++i) {
      const bucket = this._storage[i];
      // console.log('iteration bucket', i, bucket);
      for (const k in bucket) {
        const value = bucket[k];
        // console.log('iteration', i, value);
        if (value) { sum += value.length; }
      }
    }
    return sum;
  }

  countItemsPerBucket() {
    let counts = [];
    for (let i of this._storage)
      if (i)
        counts.push(Object.keys(i).length);
      else
        counts.push(0);

    return counts;
  }

  clear() {
    this._storage = new Array(this._buckets);
  }
}

module.exports = YXMLHashtable;
