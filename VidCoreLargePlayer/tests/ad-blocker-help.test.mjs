import fs from "node:fs";
import vm from "node:vm";

class ClassList {
  constructor() { this.values = new Set(); }
  add(value) { this.values.add(value); }
  remove(value) { this.values.delete(value); }
  contains(value) { return this.values.has(value); }
}

class Element {
  constructor() {
    this.listeners = new Map();
    this.classList = new ClassList();
    this.textContent = "";
    this.className = "";
    this.open = false;
  }
  addEventListener(name, callback) { this.listeners.set(name, callback); }
  click() { return this.listeners.get("click")?.(); }
  showModal() { this.open = true; }
  close() { this.open = false; }
}

const elements = {
  adBlockerHelpButton: new Element(),
  closeAdBlockerDialog: new Element(),
  copyExtensionsAddressButton: new Element(),
  adBlockerDialog: new Element(),
  fileAccessHint: new Element(),
  status: new Element()
};

let copied = "";
const context = vm.createContext({
  document: { querySelector: selector => elements[selector.slice(1)] ?? null },
  window: { location: { protocol: "file:" } },
  navigator: { clipboard: { writeText: async value => { copied = value; } } },
  console,
  Promise,
  Set,
  Map,
  String
});

vm.runInContext(
  fs.readFileSync(new URL("../ad-blocker-help.js", import.meta.url), "utf8"),
  context
);

elements.adBlockerHelpButton.click();
if (!elements.adBlockerDialog.open) throw new Error("Ad blocker dialog did not open.");
if (!elements.fileAccessHint.textContent.includes("file://")) throw new Error("Local-file warning was not shown.");
if (!elements.fileAccessHint.classList.contains("active")) throw new Error("Local-file warning was not emphasized.");

await elements.copyExtensionsAddressButton.click();
if (copied !== "edge://extensions") throw new Error("Extensions address was not copied.");
if (!elements.status.textContent.includes("Copied edge://extensions")) throw new Error("Copy confirmation was not shown.");

elements.closeAdBlockerDialog.click();
if (elements.adBlockerDialog.open) throw new Error("Ad blocker dialog did not close.");

console.log("ad blocker help dialog, file access warning, copy action, and close action passed");
