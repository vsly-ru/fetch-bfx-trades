// pair
const pair = process.argv[2]; // "tBTCUSD";

const param_start = process.argv[3]; // 2016.3.1
const parsed_ymd = param_start.split(".").map((v) => parseInt(v));
const start_date = new Date(
  parsed_ymd[0],
  parsed_ymd[1] - 1,
  parsed_ymd[2] - 2
);
// start from
function getHourDate(hour) {
  // month starts from 0
  return ymdh(
    start_date.getUTCFullYear(),
    start_date.getUTCMonth(),
    start_date.getUTCDate(),
    hour
  );
}
const axios = require("axios");
const ObjectID = require("mongodb").ObjectID;

const limit = 10000;

module.exports.PAIR = pair;
module.exports.getTrades = getTrades;
module.exports.getHourDate = getHourDate;
module.exports.pad = pad;
module.exports.ymdh = ymdh;
module.exports.h2oid = h2oid;
module.exports.t2oid = t2oid;
module.exports.oid2hour = oid2hour;
module.exports.log = log;

async function getTrades(start, end, returnMax) {
  // log(`GET trades/${pair}/hist ${new Date(start).toISOString()}`);
  const _start = Date.now();
  let re = [];
  return new Promise((resolve, reject) => {
    let timed_out = false;
    const time_out = setTimeout(() => {
      timed_out = true;
      return resolve(null);
    }, 5500);
    axios({
      url: `https://api-pub.bitfinex.com/v2/trades/${pair}/hist?limit=${limit}&sort=1&start=${start}${
        end ? "&end=" + end : ""
      }`,
      method: "GET",
      timeout: 5000,
    }).then(
      (response) => {
        if (timed_out) return;
        clearTimeout(time_out);
        re = response.data;

        if (!re || !Array.isArray(re)) {
          log(` - - - no data - - -`);
          return resolve(null);
        }
        // log(`data returned: ${re.length} trades in ${Date.now() - _start} ms`);
        if (returnMax) return resolve(re);
        if (re.length >= 9999) return resolve(null);

        return resolve(re);
      },
      (err) => {
        console.log("error:", err.message ?? err);
        return resolve(null);
      }
    );
  });
}

function pad(n, width, z) {
  z = z || "0";
  n = n + "";
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function ymdh(y, m, d, h) {
  let yy = y;
  let mm = m;
  let dd = d;
  let hh = h ? h : 0;
  if (y == "today") {
    const today = new Date();
    yy = today.getFullYear();
    mm = today.getMonth();
    dd = today.getDate();
  }
  if (y == "tmr") {
    const today = new Date();
    yy = today.getFullYear();
    mm = today.getMonth();
    dd = today.getDate();
    dd++;
  }
  return new Date(yy, mm, dd, hh, 0, 0, 0);
}

function h2oid(h) {
  const ms = getHourDate(h).getTime();
  const sec = Math.floor(ms / 1000);
  const sss = pad(sec.toString(16), 8);
  return ObjectID(sss + "0000000000000000"); // Create an ObjectId with hex timestamp
}

function t2oid(ms, id) {
  const sec = Math.floor(ms / 1000);
  const sss = pad(sec.toString(16), 8);
  const mss = pad((ms - sec * 1000).toString(16), 8);
  const idd = pad(id.toString(16), 8);
  //   console.log(`id ${id} : ${sss} | ${mss} | ${idd}`);
  return ObjectID(sss + mss + idd); // Create an ObjectId with hex timestamp
}

function oid2hour(_id) {
  const s = _id.substring(0, 8);
  return parseInt(s, 16);
}

function log(text) {
  console.log(
    color("|blue|" + new Date().toLocaleTimeString() + ":|r| " + text, false)
  );
  // const m = { id: 0, text: color('|blue|[bot]|r| ' + text, true), time: Date.now() };
}

function color(s, html) {
  while (s.indexOf("\x1b[0;31m") != -1) s = s.replace("\x1b[0;31m", "|red|");
  while (s.indexOf("\x1b[0;32m") != -1) s = s.replace("\x1b[0;32m", "|green|");
  while (s.indexOf("\x1b[0;34m") != -1) s = s.replace("\x1b[0;34m", "|blue|");
  while (s.indexOf("\x1b[0;33m") != -1) s = s.replace("\x1b[0;33m", "|y|");
  while (s.indexOf("\x1b[0m") != -1) s = s.replace("\x1b[0m", "|r|");

  if (html) {
    while (s.indexOf("|red|") != -1)
      s = s.replace("|red|", '<span style="color:#FA1A2C;">');
    while (s.indexOf("|green|") != -1)
      s = s.replace("|green|", '<span style="color:#78D039;">');
    while (s.indexOf("|blue|") != -1)
      s = s.replace("|blue|", '<span style="color:#007ACC;">');
    while (s.indexOf("|y|") != -1)
      s = s.replace("|y|", '<span style="color:#FABF16;">');
    while (s.indexOf("|r|") != -1) s = s.replace("|r|", "</span>");
  } else {
    while (s.indexOf("|red|") != -1) s = s.replace("|red|", "\x1b[0;31m");
    while (s.indexOf("|green|") != -1) s = s.replace("|green|", "\x1b[0;32m");
    while (s.indexOf("|blue|") != -1) s = s.replace("|blue|", "\x1b[0;34m");
    while (s.indexOf("|y|") != -1) s = s.replace("|y|", "\x1b[0;33m");
    while (s.indexOf("|r|") != -1) s = s.replace("|r|", "\x1b[0m");
  }

  return s;
}
