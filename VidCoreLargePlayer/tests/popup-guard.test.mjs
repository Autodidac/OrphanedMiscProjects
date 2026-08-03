import fs from "node:fs";
import vm from "node:vm";

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
  constructor() {
    this.attributes = new Map();
    this.listeners = new Map();
    this.classList = new ClassList();
    this.textContent = "";
    this.className = "";
    this.src = "";
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  addEventListener(name, callback) { this.listeners.set(name, callback); }
  click() { this.listeners.get("click")?.(); }
}

const player = new Element();
player.src = "https://example.test/movie/1";
player.setAttribute("src", player.src);
const button = new Element();
const status = new Element();
const elements = { player, popupGuardButton: button, status };
const values = new Map();

const context = vm.createContext({
  document: { querySelector: selector => elements[selector.slice(1)] ?? null },
  localStorage: {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value))
  },
  window: { setTimeout: callback => callback() },
  console,
  String,
  Map,
  Set
});

vm.runInContext(
  fs.readFileSync(new URL("../popup-guard.js", import.meta.url), "utf8"),
  context
);

const sandbox = player.getAttribute("sandbox");
if (!sandbox) throw new Error("Strict sandbox was not enabled by default.");

for (const forbidden of [
  "allow-popups",
  "allow-top-navigation",
  "allow-downloads",
  "allow-forms",
  "allow-modals"
]) {
  if (sandbox.includes(forbidden)) {
    throw new Error(`Forbidden sandbox capability enabled: ${forbidden}`);
  }
}

for (const required of ["allow-scripts", "allow-same-origin", "allow-presentation"]) {
  if (!sandbox.includes(required)) {
    throw new Error(`Required player capability missing: ${required}`);
  }
}

if (player.getAttribute("referrerpolicy") !== "no-referrer") {
  throw new Error("Strict referrer policy was not applied.");
}
if (button.textContent !== "Popup blocking: On") {
  throw new Error("Strict-mode button state is incorrect.");
}

button.click();
if (player.getAttribute("sandbox") !== null) {
  throw new Error("Compatibility mode did not remove sandbox.");
}
if (button.textContent !== "Popup blocking: Off") {
  throw new Error("Compatibility-mode button state is incorrect.");
}
if (values.get("vidcoreLibrary.strictPopupBlocking") !== "false") {
  throw new Error("Compatibility preference was not persisted.");
}

button.click();
if (!player.getAttribute("sandbox")) {
  throw new Error("Strict mode could not be re-enabled.");
}
if (!status.textContent.includes("parent-page redirects")) {
  throw new Error("Blocking status did not explain protection.");
}

console.log("popup guard defaults, restrictions, persistence, and compatibility toggle passed");
