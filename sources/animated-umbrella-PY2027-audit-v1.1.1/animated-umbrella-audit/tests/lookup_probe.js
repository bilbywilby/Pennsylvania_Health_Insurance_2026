// Runs the lookup page's view() for every county and prints [listed, onPennie] per county as JSON.
const fs = require("fs");
const html = fs.readFileSync(process.argv[2], "utf8");
const data = JSON.parse(html.match(/<script id="data"[^>]*>([\s\S]*?)<\/script>/)[1]);
const code = html.match(/<script id="app">([\s\S]*?)<\/script>/)[1];
const m = { exports: {} };
new Function("module", code)(m);
const out = {};
for (const c of Object.keys(data.counties)) { const r = m.exports.view(data, c); out[c] = [r.listed, r.pennie]; }
console.log(JSON.stringify(out));
