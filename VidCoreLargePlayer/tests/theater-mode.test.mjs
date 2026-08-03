import fs from "node:fs";
import vm from "node:vm";

class ClassList {
  constructor() { this.values = new Set(); }
  contains(value) { return this.values.has(value); }
  toggle(value, force) {
    const enabled = force ?? !this.values.has(value);
    if (enabled) this.values.add(value);
    else this.values.delete(value);
    return enabled;
  }
}

class Element {
  constructor() {
    this.textContent = "";
    this.className = "";
    this.attributes = new Map();
    this.listeners = new Map();
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  addEventListener(name, callback) { this.listeners.set(name, callback); }
  click() { this.listeners.get("click")?.({}); }
}

const body = { classList: new ClassList() };
const button = new Element();
const status = new Element();
const documentListeners = new Map();
const document = {
  body,
  fullscreenElement: null,
  querySelector(selector) {
    if (selector === "#theaterModeButton") return button;
    if (selector === "#status") return status;
    return null;
  },
  addEventListener(name, callback) { documentListeners.set(name, callback); }
};

const values = new Map();
const localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value))
};

const context = vm.createContext({ document, localStorage, String, Map, Set, console });
vm.runInContext(
  fs.readFileSync(new URL("../theater-mode.js", import.meta.url), "utf8"),
  context
);

if (body.classList.contains("theater-mode")) {
  throw new Error("Theater mode should be disabled by default.");
}
if (button.textContent !== "Theater") {
  throw new Error("The default theater button label is incorrect.");
}

button.click();
if (!body.classList.contains("theater-mode")) {
  throw new Error("Theater mode did not enable.");
}
if (button.textContent !== "Exit theater") {
  throw new Error("The enabled theater button label is incorrect.");
}
if (values.get("vidcoreLibrary.theaterMode") !== "true") {
  throw new Error("Theater preference was not persisted.");
}

const keydown = documentListeners.get("keydown");
keydown?.({ key: "Escape" });
if (body.classList.contains("theater-mode")) {
  throw new Error("Escape did not exit theater mode.");
}
if (!status.textContent.includes("restored")) {
  throw new Error("Theater exit status was not reported.");
}

console.log("theater mode toggle, persistence, and escape exit passed");
