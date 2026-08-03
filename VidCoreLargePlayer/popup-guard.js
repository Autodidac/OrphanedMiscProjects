"use strict";

(() => {
  const SETTING_KEY = "vidcoreLibrary.strictPopupBlocking";
  const STRICT_SANDBOX = "allow-scripts allow-same-origin allow-presentation";
  const STRICT_ALLOW = "autoplay; encrypted-media; fullscreen; picture-in-picture";

  const player = document.querySelector("#player");
  const button = document.querySelector("#popupGuardButton");
  const statusElement = document.querySelector("#status");

  if (!player || !button) return;

  function setStatus(message, type = "") {
    if (!statusElement) return;
    statusElement.textContent = message;
    statusElement.className = `status ${type}`.trim();
  }

  function isStrictEnabled() {
    return localStorage.getItem(SETTING_KEY) !== "false";
  }

  function reloadCurrentPlayer() {
    const currentSource = player.getAttribute("src") || player.src;
    if (!currentSource || currentSource === "about:blank") return;

    player.src = "about:blank";
    window.setTimeout(() => {
      player.src = currentSource;
    }, 0);
  }

  function applyPopupBlocking(enabled, options = {}) {
    const { reload = false, announce = true } = options;

    if (enabled) {
      player.setAttribute("sandbox", STRICT_SANDBOX);
      player.setAttribute("allow", STRICT_ALLOW);
      player.setAttribute("referrerpolicy", "no-referrer");
    } else {
      player.removeAttribute("sandbox");
      player.setAttribute("allow", STRICT_ALLOW);
      player.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    }

    button.textContent = enabled ? "Popup blocking: On" : "Popup blocking: Off";
    button.setAttribute("aria-pressed", String(enabled));
    button.classList.toggle("guard-off", !enabled);
    localStorage.setItem(SETTING_KEY, String(enabled));

    if (reload) reloadCurrentPlayer();
    if (announce) {
      setStatus(
        enabled
          ? "Strict iframe blocking enabled: popups, downloads, forms, modal dialogs, and parent-page redirects are blocked."
          : "Strict iframe blocking disabled for compatibility. Reloaded the player with normal iframe permissions.",
        enabled ? "ok" : "warn"
      );
    }
  }

  button.addEventListener("click", () => {
    applyPopupBlocking(!isStrictEnabled(), { reload: true });
  });

  applyPopupBlocking(isStrictEnabled(), { announce: false });
})();
