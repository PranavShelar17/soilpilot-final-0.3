const { evaluateCropSuitability, WEATHER_NORMALS } = require("./lib/cropSuitability/evaluator.ts");
const fs = require("fs");

const fullData = JSON.parse(fs.readFileSync("./public/data/dsm/gat_data_full.json", "utf8"));
const gat22 = fullData["22"];

console.log("Gat 22 loaded:", gat22.name);
// Let's test sugarcane and chickpea
