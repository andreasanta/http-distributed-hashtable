// components js
import YTweetsTable from 'y-tweetstable';

let th = new YTweetsTable('https://s3.eu-central-1.amazonaws.com/tweet-to-sat/20180424/tts');

// TWEETS RANDOM - SORTEO (SIN ENTRADA) - MALAGA
th.loadNamedTable('malaga', YTweetsTable.TYPE_NOTICKET)
  .then((t) => {
    console.log('malaga table loaded');
    t.retrieveRandom(20).then((res) => console.log(res));
  });

// USUARIO ESPECIFICO - SORTEO (SIN ENTRADA) - MALAGA
th.loadNamedTable('malaga', YTweetsTable.TYPE_NOTICKET)
  .then((t) => {
    console.log('malaga table loaded');
    t.retrieve('screennameusuario').then((res) => console.log(res));
  });

// TWEETS RANDOM - CONCURSO (CON ENTRADA) - MALAGA
th.loadNamedTable('malaga', YTweetsTable.TYPE_FACETOFACE)
  .then((t) => {
    console.log('malaga table loaded');
    t.retrieveRandom(20).then((res) => console.log(res));
  });

// RANKING - CONCURSO - MALAGA (devuelve array ordenado)
th.loadNamedList('malaga', YTweetsTable.TYPE_FACETOFACE)
  .then((t) => {
    console.log('malaga list loaded');
    console.log(t);
});

// USUARIO ESPECIFICO - CONCURSO (CON ENTRADA) - MALAGA
th.loadNamedTable('malaga', YTweetsTable.TYPE_FACETOFACE)
  .then((t) => {
    console.log('malaga table loaded');
    t.retrieve('screennameusuario').then((res) => console.log(res));
  });

//let yh = new YXMLHashtable('http://images.samsung.com/is/content/samsung/p5/es/test/test_tweets_');
