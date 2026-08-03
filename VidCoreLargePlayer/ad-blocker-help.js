"use strict";

(() => {
  const openButton = document.querySelector("#adBlockerHelpButton");
  const closeButton = document.querySelector("#closeAdBlockerDialog");
  const copyButton = document.querySelector("#copyExtensionsAddressButton");
  const dialog = document.querySelector("#adBlockerDialog");
  const hint = document.querySelector("#fileAccessHint");
  const statusElement = document.querySelector("#status");

  if (!openButton || !closeButton || !copyButton || !dialog) return;

  function setStatus(message, type = "") {
    if (!statusElement) return;
    statusElement.textContent = message;
    statusElement.className = `status ${type}`.trim();
  }

  function updateHint() {
    if (!hint) return;
    if (window.location.protocol === "file:") {
      hint.textContent = "This player is running from file://. Your blocker must have Allow access to file URLs enabled, or it cannot filter the embedded page reliably.";
      hint.classList.add("active");
    } else {
      hint.textContent = "This player is running from a web origin. Confirm your blocker is enabled for this site and the embedded provider.";
      hint.classList.remove("active");
    }
  }

  openButton.addEventListener("click", () => {
    updateHint();
    dialog.showModal();
  });

  closeButton.addEventListener("click", () => dialog.close());

  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText("edge://extensions");
      setStatus("Copied edge://extensions. Paste it into the address bar.", "ok");
    } catch {
      setStatus("Open edge://extensions in the address bar.", "warn");
    }
  });
})();
