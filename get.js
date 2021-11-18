if (!process.argv[2] || !process.argv[3]) {
  return console.log(`<bfx trades downloader>
  Usage: node get.js tETHUSD 2016.3.1 (offset? – days from now)`);
}

const {
  PAIR,
  getTrades,
  getHourDate,
  pad,
  t2oid,
  log,
} = require("./setup.js");

var MongoClient = require("mongodb").MongoClient;
var url = "mongodb://localhost:27017/";
let db;

let totalProcessed = 0;
let totalInserted = 0;
let beginningOfTime = getHourDate(0).getTime();

const offset_days_back_from_now = process.argv[4];   // offset or 0
if (offset_days_back_from_now) log(`running with offset ${offset_days_back_from_now} days`);
let nextTime = offset_days_back_from_now ? Date.now() - parseInt(parseFloat(offset_days_back_from_now) * 86400000)
  : beginningOfTime;

//   let hour = 0;


MongoClient.connect(url, { useUnifiedTopology: true }, (err, database) => {
  if (err) {
    console.log(err);
    process.exit(1);
    return;
  }
  db = database.db(PAIR);
  // dbHours = db.collection("hours");
  next();
});

const started_time = Date.now();

const speedPerSecond = () => {
  const passed = Date.now() - started_time - -1;
  return ((totalProcessed / passed) * 1000).toFixed(2);
};

log(`starting downloading from ${new Date(nextTime).toDateString()}`)

async function next() {
  const prevTime = nextTime;
  nextTime = await processData(await getTrades(nextTime, null, true));
  if (!nextTime) return log(`STOP at ${prevTime}`);
  setTimeout(() => {
    next(nextTime);
  }, 777);
}

var lastTime = 0;

async function processData(data) {
  if (!data || !data.length) {
    console.log('no data to process:', data);
    return lastTime;
  }
  const count = data.length;
  let maxTime = nextTime;
  totalProcessed += count;
  let db_trades = [];
  // prepare records to write;
  data.forEach((t) => {
    const tid = t[0];
    const time = t[1];
    if (time > maxTime) maxTime = time;
    const price = t[3];
    const record = {
      _id: t2oid(time, tid),
      t: Math.floor(time / 1000),
      p: price,
    };
    db_trades.push(record);
  });

  // write trades, if any
  if (count > 0)
    db.collection("trades").insertMany(
      db_trades,
      { ordered: false },
      (err, re) => {
        if (err && !err.message.includes("E11000"))
          console.log("insertMany err:", err);
        let inserted = 0;
        if (err && err.message.includes("E11000")) {
          //   console.log("BulkWriteError:", Object.keys(err), err);
          //   console.log("keys", Object.keys(err.result));
          //   console.log(err.result.result);
          if (err.result.result.nInserted)
            inserted = err.result.result.nInserted;
          // console.log("err.result.BulkWriteResult.result | ",err.result.BulkWriteResult.result);
        }

        if (!err && re && re.insertedCount) inserted += re.insertedCount;
        totalInserted += inserted;
        const timeLeft = Date.now() - nextTime;
        const DaysLeft = (timeLeft / 86400000).toFixed(2);
        const allTime = Date.now() - beginningOfTime;
        const percent =
          pad((((allTime - timeLeft) / allTime) * 100).toFixed(1), 6) + "%";
        log(
          `${new Date(
            nextTime
          ).toLocaleDateString()} | ${percent} ${DaysLeft} days left | written ${inserted > 0 ? "|green|" + pad(inserted, 5) : "|red|ZERO" + inserted
          }|r| of ${count} new trades | total ${totalInserted} written trades |  ${speedPerSecond()} trades/s. | total processed: ${totalProcessed} trades`
        );
        if (nextTime >= Date.now() - 600_000) {
          log(`${Date.now() - nextTime} ms left`);
          if (nextTime >= Date.now() - 55_000) {
            console.log();
            log('TODAY -> DONE');
            console.log();
            process.exit(0);
          }
        }
        //   console.log(re);
      }
    );
  lastTime = maxTime;
  return maxTime; // time to get the next chunk of trades from
}
