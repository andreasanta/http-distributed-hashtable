import YXMLHashtable from 'y-xmlhashtable';

/**
 * Helper object that relies on y-xmlhashtable for loading
 * several hashtables in parallel and rankings per city.
 */
class YTweetsTable {

  static get debugBaseUrl() { return 'https://s3.eu-central-1.amazonaws.com/tweet-to-sat/test_tweets_'; }

  static get TYPE_FACETOFACE()  { return '_ticket'; }
  static get TYPE_NOTICKET()  { return '_noticket'; }

  constructor(basePath, debug = false, delimiter = '_', suffix = '_'){

    if (!debug && !basePath)
      throw 'No basepath set!';

    this._debug = debug;
    this._basePath = basePath;
    this._delimiter = delimiter;
    this._suffix = suffix;

    this.clear();
  }

  clear() {

    this._tables = {};
    this._tables[YTweetsTable.TYPE_FACETOFACE] = {};
    this._tables[YTweetsTable.TYPE_NOTICKET] = {};

    this._rankings = {};
  }

  countLoadedLists(byType)
  {
    return this._rankings[byType] ? this._rankings[byType].count() : 0;
  }

  countLoadedTables(byType)
  {
    return Object.keys(this._tables[byType]).length;
  }

  loadNamedTable(name, byType)
  {
    return new Promise((res, rej) => {

      let table = this._tables[byType][name];

      if (!table)
      {
        let tableBasePath = this._debug ? YTweetsTable.debugBaseUrl :
                            this._basePath + this._delimiter + name + byType + this._suffix;
        console.log('Named table path ' + tableBasePath);
        this._tables[byType][name] = new YXMLHashtable(tableBasePath);
        table = this._tables[byType][name];
      }

      res(table);
    });
  }

  isTableAvailable(name, byType) {

    return new Promise((res, rej) => {
      let tableBasePath = this._debug ? YTweetsTable.debugBaseUrl :
                          this._basePath + this._delimiter + name + byType + this._suffix;
        $.ajax({
         type: 'HEAD',
         url: tableBasePath,
         success: res,
         error: function(jqXHR, textStatus, errorThrown){
           rej(textStatus);
         }
       });
     });
  }

  loadNamedList(name, byType)
  {
    let table = this._rankings[byType];
    if (!table)
    {
      let tableBasePath = this._debug ? YTweetsTable.debugBaseUrl :
                          this._basePath + byType + '_list' + this._suffix;
      console.log('Named list path ' + tableBasePath);
      this._rankings[byType] = new YXMLHashtable(tableBasePath);
      table = this._rankings[byType];
    }

    return table.retrieve(name);
  }

  isListAvailable(name, byType) {

    return new Promise((res, rej) => {
      let tableBasePath = this._debug ? YTweetsTable.debugBaseUrl :
                          this._basePath + byType + '_list' + this._suffix;
      console.log('Named list path ' + tableBasePath);
        $.ajax({
         type: 'HEAD',
         url: tableBasePath,
         success: res,
         error: function(jqXHR, textStatus, errorThrown){
           rej(textStatus);
         }
       });

     });
  }

}

module.exports = YTweetsTable;
