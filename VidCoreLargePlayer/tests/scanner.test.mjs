import fs from "node:fs";
import vm from "node:vm";

class ClassList { toggle() {} }
class Element {
  constructor() {
    this.listeners = [];
    this.textContent = "";
    this.disabled = false;
    this.value = "number";
    this.innerHTML = "";
    this.classList = new ClassList();
  }
  addEventListener(...args) { this.listeners.push(args); }
  closest() { return null; }
}

const elements = Object.fromEntries(
  ["previousButton", "nextButton", "randomButton", "randomMode", "recommendedCards"]
    .map(id => [id, new Element()])
);
const data = new Map();

const context = vm.createContext({
  window: { setTimeout: callback => callback(), VidCoreDiscovery: { isGenericTitle: () => false } },
  document: { querySelector: selector => elements[selector.slice(1)] || null },
  localStorage: {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value))
  },
  URL, Date, Math, Promise,
  resolveMetadata: async () => ({ title: "Resolved", image: "cover.jpg", resolutionStatus: "resolved" }),
  resolveSelectedList: async () => {},
  renderRelated: () => {},
  renderLibrary: async () => {},
  renderContinueWatching: async () => {},
  showPanel: () => {},
  state: { related: [], storageReady: Promise.resolve(), currentMetadata: null, currentMetadataKey: "" },
  entryKey: entry => `${entry.mode}|${entry.id}`,
  renderCurrent: () => {}, loadRelated: async () => {}, isCurrentEntry: () => false,
  baseUrlInput: { value: "https://vidcore.net" }, modeSelect: { value: "movie" },
  $: selector => elements[selector.slice(1)] || null,
  posterMarkup: () => "<div></div>", escapeHtml: String,
  fallbackTitle: entry => `Movie ${entry.id}`, setStatus: () => {},
  selectedEntries: entries => entries, getAll: async () => [], FAVORITES_STORE: "favorites",
  runSparql: async () => ({ results: { bindings: [] } }),
  bindingValue: (binding, key) => binding?.[key]?.value || "",
  normalizeBaseUrl: value => value,
  currentEntry: () => ({ baseUrl: "https://vidcore.net", mode: "movie", id: "1" }),
  play: () => {}, console
});

vm.runInContext(fs.readFileSync(new URL("../scanner.js", import.meta.url), "utf8"), context);
const scanner = context.window.VidCoreScanner;
if (!scanner) throw new Error("Scanner helpers were not exported.");

scanner.addResolvedImage({ mode: "movie", id: "1", title: "One", image: "one.jpg" });
scanner.addResolvedImage({ mode: "movie", id: "2", title: "Two", image: "two.jpg" });
scanner.addResolvedImage({ mode: "movie", id: "1", title: "One New", image: "new.jpg" });
const queue = scanner.readQueue();
if (queue.length !== 2 || queue[0].title !== "One New") {
  throw new Error("Rolling queue did not deduplicate and promote the latest resolved image.");
}
scanner.addResolvedImage({ mode: "movie", id: "3", title: "No image", image: "" });
if (scanner.readQueue().length !== 2) throw new Error("An image-less result entered the queue.");

const nextQuery = scanner.neighborPickQuery("movie", 1234, 1);
if (!nextQuery.includes("P4947") || !nextQuery.includes("?numericId > 1234") || !nextQuery.includes("ASC(?numericId)")) {
  throw new Error("Next-match query is incorrect.");
}
const previousQuery = scanner.neighborPickQuery("tv", 500, -1);
if (!previousQuery.includes("P4983") || !previousQuery.includes("?numericId < 500") || !previousQuery.includes("DESC(?numericId)")) {
  throw new Error("Previous-match query is incorrect.");
}
const seedQuery = scanner.seedPickQuery("movie", 9000);
if (!seedQuery.includes("?numericId >= 9000")) throw new Error("Random-number seed query is incorrect.");
const databaseQuery = scanner.databaseTitlePickQuery("tv", 1999, 7);
if (!databaseQuery.includes("P4983") || !databaseQuery.includes("YEAR(?date) = 1999") || !databaseQuery.includes("MONTH(?date) = 7")) {
  throw new Error("Database-title query is incorrect.");
}

const indexHtml = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const discoveryIndex = indexHtml.indexOf('src="discovery.js"');
const scannerIndex = indexHtml.indexOf('src="scanner.js"');
if (discoveryIndex < 0 || scannerIndex < 0 || scannerIndex < discoveryIndex) {
  throw new Error("scanner.js must load after discovery.js in index.html.");
}

console.log("rolling queue, direct database discovery, and shipped script order passed");
