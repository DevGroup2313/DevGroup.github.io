/* LAKAY | writes src/brand/lakay-crest.svg (the flat crest) from src/js/09-crest.js. Run: node tools/crest.js */
"use strict";
var fs = require("fs"), path = require("path");
global.E = { util: { h: function () { } } }; global.window = {};
require(path.join(__dirname, "..", "src", "js", "09-crest.js"));
fs.writeFileSync(path.join(__dirname, "..", "src", "brand", "lakay-crest.svg"), E.crest.flatSource() + "\n");
console.log("src/brand/lakay-crest.svg written");
