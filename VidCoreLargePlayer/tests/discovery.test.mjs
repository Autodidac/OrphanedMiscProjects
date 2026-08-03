import fs from "node:fs";
import vm from "node:vm";

class ClassList {
  constructor() { this.values = new Set(); }
  toggle(value, force) {
    const enabled = force ?? !this.values.has(value);
    if (enabled) this.values.add(value); else this.values.delete(value);
    return enabled;
  }
}

class Element {
  constructor() {
    this.listeners = new Map();
    this.classList = new ClassList();
    this.innerHTML = "";
    this.disabled = false;
    this.value = "";
  }
  addEventListener(name, callback) { this.listeners.set(name, callback); }
  closest() { return null; }
}

const elements = {
  recommendedCards: new Element(),
  randomButton: new Element(),
  recommendedPanel: new Element(),
  resolveListButton: new Element()
};

const context = vm.createContext({
  window: { setTimeout: callback => callback() },
  document: { querySelector: selector => elements[selector.slice(1)] ?? null },
  URL,
  Date,
  Math,
  Promise,
  queueMicrotask: callback => callback(),
  fetch: async () => ({ ok: true, json: async () => ({ query: { pages: {} } }) }),
  state: { storageReady: Promise.resolve(), related: [], currentMetadata: null, currentMetadataKey: "" },
  metadataFromBinding: (entry, binding) => ({ title: binding?.title || `Movie ${entry.id}`, description: "", image: "", resolutionStatus: "resolved" }),
  metadataQuery: () => "",
  bulkMetadataQuery: () => "",
  resolveMetadata: async entry => ({ title: `Movie ${entry.id}`, description: "", image: "", article: "" }),
  resolveSelectedList: async () => {},
  renderRelated: () => {},
  renderLibrary: async () => {},
  renderContinueWatching: async () => {},
  showPanel: () => {},
  fallbackTitle: entry => entry.mode === "movie" ? `Movie ${entry.id}` : `TV ${entry.id}`,
  sparqlLiteral: value => JSON.stringify(String(value)),
  bindingValue: (binding, key) => binding?.[key]?.value || "",
  selectedEntries: entries => entries,
  getAll: async () => [],
  getValue: async () => null,
  putValue: async () => {},
  runSparql: async () => ({ results: { bindings: [] } }),
  renderListControls: async () => {},
  renderCurrent: () => {},
  loadRelated: async () => {},
  isCurrentEntry: () => false,
  entryKey: entry => `${entry.mode}|${entry.id}`,
  posterMarkup: () => "<div></div>",
  escapeHtml: value => String(value),
  baseUrlInput: { value: "https://vidcore.net" },
  currentEntrySafe: () => ({ mode: "movie", id: "1" }),
  play: () => {},
  setStatus: () => {},
  FAVORITES_STORE: "favorites",
  HISTORY_STORE: "history",
  console
});
context.$ = selector => context.document.querySelector(selector);

vm.runInContext(fs.readFileSync(new URL("../discovery.js", import.meta.url), "utf8"), context);

const core = context.window.VidCoreDiscovery;
if (!core) throw new Error("Discovery helpers were not exported.");

const entry = { mode: "movie", id: "42" };
const merged = core.mergeWikipediaMetadata(
  entry,
  { title: "Movie 42", description: "", image: "", resolutionStatus: "resolved" },
  { title: "The Answer", description: "A film.", image: "cover.jpg", wikipedia: "wiki" }
);
if (merged.title !== "The Answer" || merged.image !== "cover.jpg" || merged.description !== "A film.") {
  throw new Error("Wikipedia fallback did not repair missing metadata.");
}

const candidates = core.recommendationCandidates(
  [{ mode: "movie", id: "10", title: "Saved", baseUrl: "https://vidcore.net" }],
  [{ mode: "movie", id: "11", title: "Recent", baseUrl: "https://vidcore.net", completed: false }],
  [{ mode: "movie", imdb: "tt0000012", title: "Related" }],
  "https://vidcore.net"
);
if (candidates.length !== 3) throw new Error("Recommendation sources were not combined.");

const random = core.chooseRandomCandidate(candidates, "movie|10||", () => 0);
if (!random || random.id !== "11" || !random.known) {
  throw new Error("Random selection did not prefer a known non-current title.");
}

console.log("metadata repair, recommendation aggregation, and random selection passed");
