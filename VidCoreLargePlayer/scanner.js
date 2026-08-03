"use strict";

(() => {
  const QUEUE_KEY = "vidcoreLibrary.discoveryQueue";
  const QUEUE_LIMIT = 40;
  const SCAN_DELAY_MS = 650;
  const RANDOM_MAX_ID = 2000000;
  const prefetched = new Map();
  let activeScan = null;

  const baseResolveMetadata = resolveMetadata;
  const baseResolveSelectedList = resolveSelectedList;
  const baseRenderRelated = renderRelated;
  const baseRenderLibrary = renderLibrary;
  const baseRenderContinueWatching = renderContinueWatching;
  const baseShowPanel = showPanel;

  function keyOf(entry) {
    return `${entry.mode}|${entry.id}|${entry.season || ""}|${entry.episode || ""}`;
  }

  function readQueue() {
    try {
      const parsed = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeQueue(entries) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(entries.slice(0, QUEUE_LIMIT)));
  }

  function addResolvedImage(entry) {
    if (!entry?.id || !entry?.image) return;
    const normalized = {
      ...entry,
      baseUrl: entry.baseUrl || baseUrlInput.value || "https://vidcore.net",
      discoveredAt: new Date().toISOString()
    };
    const key = keyOf(normalized);
    const queue = readQueue().filter(item => keyOf(item) !== key);
    queue.unshift(normalized);
    writeQueue(queue);
    renderRollingRecommendations();
  }

  function recommendationCard(entry, index) {
    const modeText = entry.mode === "movie"
      ? "Movie"
      : `TV · S${entry.season || 1} E${entry.episode || 1}`;
    return `<article class="card">${posterMarkup(entry)}<div class="card-body">
      <h3 class="card-title" title="${escapeHtml(entry.title || fallbackTitle(entry))}">${escapeHtml(entry.title || fallbackTitle(entry))}</h3>
      <div class="card-meta"><span>${escapeHtml(modeText)}</span>${entry.year ? `<span>${escapeHtml(entry.year)}</span>` : ""}<span>Discovered</span></div>
      <div class="card-actions"><button class="mini" type="button" data-discovery-index="${index}">Play</button></div>
    </div></article>`;
  }

  function renderRollingRecommendations() {
    const container = $("#recommendedCards");
    const randomButton = $("#randomButton");
    if (randomButton) randomButton.disabled = false;
    if (!container) return;
    const entries = readQueue();
    container.innerHTML = entries.length
      ? entries.map(recommendationCard).join("")
      : '<div class="empty-list">Resolved titles with cover art appear here automatically, even when they are not saved.</div>';
  }

  function scheduleRollingRender() {
    window.setTimeout(renderRollingRecommendations, 0);
  }

  async function applyPrefetched(entry, metadata, quiet) {
    state.currentMetadata = metadata;
    state.currentMetadataKey = entryKey(entry);
    renderCurrent(entry, metadata);
    addResolvedImage({ ...entry, ...metadata });
    await loadRelated(entry, metadata);
    if (!quiet) setStatus(`Resolved: ${metadata.title}`, "ok");
    return metadata;
  }

  resolveMetadata = async function scannerAwareResolveMetadata(entry, quiet = false) {
    const key = entryKey(entry);
    if (prefetched.has(key)) {
      const metadata = prefetched.get(key);
      prefetched.delete(key);
      if (isCurrentEntry(entry)) return applyPrefetched(entry, metadata, quiet);
      return metadata;
    }

    const metadata = await baseResolveMetadata(entry, quiet);
    addResolvedImage({ ...entry, ...metadata });
    return metadata;
  };

  resolveSelectedList = async function scannerAwareResolveSelectedList() {
    await baseResolveSelectedList();
    const entries = selectedEntries(await getAll(FAVORITES_STORE));
    for (const entry of entries) addResolvedImage(entry);
    scheduleRollingRender();
  };

  renderRelated = function scannerAwareRenderRelated() {
    const result = baseRenderRelated();
    window.setTimeout(() => {
      for (const item of state.related || []) {
        const id = item.imdb || item.tmdb;
        if (!id || !item.image) continue;
        addResolvedImage({
          ...item,
          id,
          baseUrl: baseUrlInput.value || "https://vidcore.net",
          season: item.mode === "tv" ? 1 : undefined,
          episode: item.mode === "tv" ? 1 : undefined
        });
      }
      renderRollingRecommendations();
    }, 0);
    return result;
  };

  renderLibrary = async function scannerAwareRenderLibrary() {
    const result = await baseRenderLibrary();
    scheduleRollingRender();
    return result;
  };

  renderContinueWatching = async function scannerAwareRenderContinueWatching() {
    const result = await baseRenderContinueWatching();
    scheduleRollingRender();
    return result;
  };

  showPanel = function scannerAwareShowPanel(panel) {
    baseShowPanel(panel);
    if (panel === "recommended") scheduleRollingRender();
  };

  function sleep(milliseconds) {
    return new Promise(resolve => window.setTimeout(resolve, milliseconds));
  }

  function setScanButtons(scanning) {
    const previous = $("#previousButton");
    const next = $("#nextButton");
    const random = $("#randomButton");
    if (previous) previous.textContent = scanning ? "Stop scan" : "Previous";
    if (next) next.textContent = scanning ? "Stop scan" : "Next";
    if (random) random.textContent = scanning ? "Stop scan" : "Random";
  }

  function cancelScan() {
    if (!activeScan) return false;
    activeScan.cancelled = true;
    activeScan = null;
    setScanButtons(false);
    setStatus("Discovery scan stopped.", "warn");
    return true;
  }

  function isResolvedMatch(entry, metadata) {
    const generic = window.VidCoreDiscovery?.isGenericTitle?.(entry, metadata?.title);
    return metadata?.resolutionStatus === "resolved" && !generic;
  }

  async function findResolvedMetadata(entry) {
    const metadata = await baseResolveMetadata(entry, true);
    return isResolvedMatch(entry, metadata) ? metadata : null;
  }

  async function scanNumeric(direction, explicitStart = null) {
    if (cancelScan()) return;
    const current = currentEntry();
    if (!/^\d+$/.test(current.id)) {
      setStatus("Sequential discovery requires a numeric TMDB ID.", "warn");
      return;
    }

    const token = { cancelled: false };
    activeScan = token;
    setScanButtons(true);
    let candidateId = explicitStart ?? (Number.parseInt(current.id, 10) + direction);

    try {
      while (!token.cancelled) {
        if (candidateId < 1) throw new Error("No lower numeric IDs remain.");
        const entry = { ...current, id: String(candidateId) };
        setStatus(`Checking public metadata for ${entry.mode} ID ${entry.id}…`);
        const metadata = await findResolvedMetadata(entry);
        if (token.cancelled) return;
        if (metadata) {
          addResolvedImage({ ...entry, ...metadata });
          prefetched.set(entryKey(entry), metadata);
          activeScan = null;
          setScanButtons(false);
          setStatus(`Found ${metadata.title} at ID ${entry.id}.`, "ok");
          play(entry);
          return;
        }
        candidateId += direction;
        await sleep(SCAN_DELAY_MS);
      }
    } catch (error) {
      if (!token.cancelled) setStatus(`Discovery stopped: ${error.message}`, "error");
    } finally {
      if (activeScan === token) activeScan = null;
      setScanButtons(false);
    }
  }

  function databasePickQuery(mode, seed) {
    const property = mode === "movie" ? "P4947" : "P4983";
    const idVariable = mode === "movie" ? "movieTmdb" : "tvTmdb";
    return `SELECT ?${idVariable} ?numericId WHERE {
      ?item wdt:${property} ?${idVariable}.
      BIND(xsd:integer(?${idVariable}) AS ?numericId)
      FILTER(?numericId >= ${seed})
    } ORDER BY ?numericId LIMIT 1`;
  }

  async function randomDatabasePick() {
    if (cancelScan()) return;
    const mode = modeSelect.value;
    const token = { cancelled: false };
    activeScan = token;
    setScanButtons(true);

    try {
      const seed = 1 + Math.floor(Math.random() * RANDOM_MAX_ID);
      setStatus(`Choosing a random ${mode} from the public metadata database…`);
      let data = await runSparql(databasePickQuery(mode, seed));
      if (!data.results.bindings.length) data = await runSparql(databasePickQuery(mode, 1));
      if (token.cancelled) return;
      const binding = data.results.bindings[0];
      const id = bindingValue(binding, mode === "movie" ? "movieTmdb" : "tvTmdb");
      if (!id) throw new Error("No usable database ID was returned.");
      const entry = {
        baseUrl: normalizeBaseUrl(baseUrlInput.value),
        mode,
        id,
        ...(mode === "tv" ? { season: 1, episode: 1 } : {})
      };
      const metadata = await findResolvedMetadata(entry);
      if (!metadata) throw new Error("The database result did not resolve to usable metadata.");
      addResolvedImage({ ...entry, ...metadata });
      prefetched.set(entryKey(entry), metadata);
      activeScan = null;
      setScanButtons(false);
      setStatus(`Database pick: ${metadata.title}.`, "ok");
      play(entry);
    } catch (error) {
      if (!token.cancelled) setStatus(`Random database pick failed: ${error.message}`, "error");
    } finally {
      if (activeScan === token) activeScan = null;
      setScanButtons(false);
    }
  }

  function randomDiscovery() {
    if ($("#randomMode")?.value === "database") return randomDatabasePick();
    return scanNumeric(1, 1 + Math.floor(Math.random() * RANDOM_MAX_ID));
  }

  $("#previousButton")?.addEventListener("click", event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    scanNumeric(-1);
  }, true);

  $("#nextButton")?.addEventListener("click", event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    scanNumeric(1);
  }, true);

  $("#randomButton")?.addEventListener("click", event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    randomDiscovery();
  }, true);

  $("#recommendedCards")?.addEventListener("click", event => {
    const button = event.target.closest("[data-discovery-index]");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const entry = readQueue()[Number(button.dataset.discoveryIndex)];
    if (entry) play(entry);
  }, true);

  renderRollingRecommendations();
  state.storageReady?.then(scheduleRollingRender).catch(() => {});

  window.VidCoreScanner = {
    addResolvedImage,
    readQueue,
    databasePickQuery
  };
})();
