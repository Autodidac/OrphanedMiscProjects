"use strict";

(() => {
  const SETTING_KEY = "vidcoreLibrary.theaterMode";
  const button = document.querySelector("#theaterModeButton");
  const statusElement = document.querySelector("#status");

  if (!button || !document.body) return;

  function setStatus(message, type = "") {
    if (!statusElement) return;
    statusElement.textContent = message;
    statusElement.className = `status ${type}`.trim();
  }

  function isEnabled() {
    return document.body.classList.contains("theater-mode");
  }

  function applyTheaterMode(enabled, announce = true) {
    document.body.classList.toggle("theater-mode", enabled);
    button.textContent = enabled ? "Exit theater" : "Theater";
    button.setAttribute("aria-pressed", String(enabled));
    localStorage.setItem(SETTING_KEY, String(enabled));

    if (announce) {
      setStatus(
        enabled
          ? "Theater mode enabled: the player fills the available browser width without entering fullscreen."
          : "Theater mode disabled: library and title details restored.",
        "ok"
      );
    }
  }

  button.addEventListener("click", () => {
    applyTheaterMode(!isEnabled());
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && isEnabled() && !document.fullscreenElement) {
      applyTheaterMode(false);
    }
  });

  applyTheaterMode(localStorage.getItem(SETTING_KEY) === "true", false);
})();
