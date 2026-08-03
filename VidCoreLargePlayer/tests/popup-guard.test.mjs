import fs from "node:fs";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const tombstone = fs.readFileSync(new URL("../popup-guard.js", import.meta.url), "utf8");

if (/\ssandbox=/.test(html)) {
  throw new Error("The provider-detected iframe sandbox is still present.");
}
if (html.includes("popup-guard.js")) {
  throw new Error("index.html still loads the retired popup guard.");
}
if (!html.includes("ad-blocker-help.js")) {
  throw new Error("The ad blocker help replacement is not loaded.");
}
if (!tombstone.includes("no longer applies an iframe sandbox")) {
  throw new Error("The compatibility tombstone does not explain the retired guard.");
}

console.log("sandbox guard retired and ad blocker help replacement loaded");
