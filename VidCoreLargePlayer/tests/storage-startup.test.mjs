import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import path from "node:path";

class ClassList {
  constructor() { this.values = new Set(); }
  toggle(value, force) {
    const enabled = force ?? !this.values.has(value);
    if (enabled) this.values.add(value);
    else this.values.delete(value);
    return enabled;
  }
}

class Element {
  constructor(id = "") {
    this.id = id;
    this.value = "";
    this.textContent = "";
    this.innerHTML = "";
    this.className = "";
    this.classList = new ClassList();
    this.dataset = {};
    this.style = {};
    this.disabled = false;
    this.src = "";
    this.files = [];
    this.listeners = new Map();
  }

  addEventListener(type, callback) { this.listeners.set(type, callback); }
  closest() { return null; }
  showModal() {}
  close() {}
  removeAttribute() {}
  async requestFullscreen() {}
  click() {}
}

const ids = [
  "baseUrl", "mode", "mediaId", "season", "episode", "player", "emptyPlayer", "status",
  "favoriteButton", "addListButton", "resolveListButton", "markListWatchedButton",
  "exportButton", "importButton", "currentTitle", "currentMeta", "currentDescription",
  "currentPoster", "currentImdb", "currentTmdb", "relatedCards", "listChips", "saveList",
  "newListName", "librarySearch", "libraryCards", "continueCards", "saveNotes", "saveDialog",
  "storageDialog", "playerWrap", "playButton", "previousButton", "nextButton", "resolveButton",
  "fullscreenButton", "saveForm", "cancelSave", "importFile", "storageButton", "closeStorage",
  "libraryPanel", "continuePanel", "relatedPanel"
];

const elements = new Map(ids.map(id => [id, new Element(id)]));
elements.get("baseUrl").value = "https://vidcore.net";
elements.get("mode").value = "movie";
elements.get("mediaId").value = "1";
elements.get("season").value = "1";
elements.get("episode").value = "1";

const storageValues = new Map();
const localStorage = {
  getItem: key => storageValues.has(key) ? storageValues.get(key) : null,
  setItem: (key, value) => storageValues.set(key, String(value)),
  removeItem: key => storageValues.delete(key)
};

const document = {
  querySelector(selector) {
    if (selector.startsWith("#")) return elements.get(selector.slice(1)) ?? new Element();
    return new Element();
  },
  querySelectorAll() { return []; },
  createElement() { return new Element(); },
  fullscreenElement: null,
  async exitFullscreen() {}
};

const context = vm.createContext({
  console,
  document,
  localStorage,
  window: { setTimeout, clearTimeout, indexedDB: undefined },
  URL,
  Blob,
  fetch: async () => ({ ok: true, json: async () => ({ results: { bindings: [] } }) }),
  indexedDB: undefined,
  navigator: { clipboard: { writeText: async () => {} } },
  setTimeout,
  clearTimeout,
  Promise,
  Date,
  JSON,
  Map,
  Set,
  String,
  Number,
  Boolean,
  Array,
  Object,
  RegExp,
  Error
});

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.resolve(testDirectory, "..", "app.js");
vm.runInContext(fs.readFileSync(appPath, "utf8"), context, { filename: appPath });
await new Promise(resolve => setTimeout(resolve, 20));

elements.get("newListName").value = "Weekend";
await vm.runInContext("addList()", context);

const lists = JSON.parse(localStorage.getItem("vidcoreLibrary.fallback.lists"));
if (!lists.Favorites || !lists.Weekend) {
  throw new Error("Fallback list creation failed.");
}

if (elements.get("status").textContent !== "Created list: Weekend") {
  throw new Error(`Unexpected creation status: ${elements.get("status").textContent}`);
}

elements.get("newListName").value = "weekend";
await vm.runInContext("addList()", context);
if (!elements.get("status").textContent.startsWith("List already exists:")) {
  throw new Error("Case-insensitive duplicate-list guard failed.");
}

console.log("storage startup, fallback, and list creation passed");
