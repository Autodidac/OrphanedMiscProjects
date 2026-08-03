"use strict";

(() => {
  const recommendationState = { entries: [], refreshQueued: false };

  const originalMetadataFromBinding = metadataFromBinding;
  const originalResolveMetadata = resolveMetadata;
  const originalResolveSelectedList = resolveSelectedList;
  const originalRenderRelated = renderRelated;
  const originalRenderLibrary = renderLibrary;
  const originalRenderContinueWatching = renderContinueWatching;
  const originalShowPanel = showPanel;

  function isGenericTitle(entry, title) {
    if (!title) return true;
    const normalized = String(title).trim();
    return normalized === fallbackTitle(entry) || /^Q\d+$/i.test(normalized) || /^(movie|tv)\s+\d+/i.test(normalized);
  }

  function needsMetadataRepair(entry) {
    return !entry?.image || isGenericTitle(entry, entry?.title) || !entry?.description;
  }

  function articleTitle(articleUrl) {
    if (!articleUrl) return "";
    try {
      const url = new URL(articleUrl);
      const marker = "/wiki/";
      const index = url.pathname.indexOf(marker);
      return index >= 0 ? decodeURIComponent(url.pathname.slice(index + marker.length)) : "";
    } catch {
      return "";
    }
  }

  function metadataQueryWithArticle(entry) {
    const identifierPattern = /^tt\d+$/i.test(entry.id)
      ? `?item wdt:P345 ${sparqlLiteral(entry.id)}.`
      : entry.mode === "movie"
        ? `?item wdt:P4947 ${sparqlLiteral(entry.id)}.`
        : `?item wdt:P4983 ${sparqlLiteral(entry.id)}.`;

    return `SELECT ?item ?itemLabel ?itemDescription ?date ?image ?imdb ?movieTmdb ?tvTmdb ?article
      (GROUP_CONCAT(DISTINCT ?genreLabel; separator="|") AS ?genres)
      (GROUP_CONCAT(DISTINCT STR(?genre); separator="|") AS ?genreUris)
      WHERE {
        ${identifierPattern}
        OPTIONAL { ?item wdt:P577 ?date. }
        OPTIONAL { ?item wdt:P18 ?image. }
        OPTIONAL { ?item wdt:P345 ?imdb. }
        OPTIONAL { ?item wdt:P4947 ?movieTmdb. }
        OPTIONAL { ?item wdt:P4983 ?tvTmdb. }
        OPTIONAL { ?article schema:about ?item; schema:isPartOf <https://en.wikipedia.org/>. }
        OPTIONAL {
          ?item wdt:P136 ?genre.
          ?genre rdfs:label ?genreLabel.
          FILTER(LANG(?genreLabel)="en")
        }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }
      GROUP BY ?item ?itemLabel ?itemDescription ?date ?image ?imdb ?movieTmdb ?tvTmdb ?article
      LIMIT 1`;
  }

  function bulkMetadataQueryWithArticle(entries) {
    const rows = entries
      .map((entry, index) => `(${sparqlLiteral(String(index))} ${sparqlLiteral(entry.mode)} ${sparqlLiteral(entry.id)})`)
      .join(" ");

    return `SELECT ?lookup ?mode ?id ?item ?itemLabel ?itemDescription ?date ?image ?imdb ?movieTmdb ?tvTmdb ?article
      (GROUP_CONCAT(DISTINCT ?genreLabel; separator="|") AS ?genres)
      (GROUP_CONCAT(DISTINCT STR(?genre); separator="|") AS ?genreUris)
      WHERE {
        VALUES (?lookup ?mode ?id) { ${rows} }
        { FILTER(STRSTARTS(?id,"tt")) ?item wdt:P345 ?id. }
        UNION { FILTER(?mode="movie" && !STRSTARTS(?id,"tt")) ?item wdt:P4947 ?id. }
        UNION { FILTER(?mode="tv" && !STRSTARTS(?id,"tt")) ?item wdt:P4983 ?id. }
        OPTIONAL { ?item wdt:P577 ?date. }
        OPTIONAL { ?item wdt:P18 ?image. }
        OPTIONAL { ?item wdt:P345 ?imdb. }
        OPTIONAL { ?item wdt:P4947 ?movieTmdb. }
        OPTIONAL { ?item wdt:P4983 ?tvTmdb. }
        OPTIONAL { ?article schema:about ?item; schema:isPartOf <https://en.wikipedia.org/>. }
        OPTIONAL {
          ?item wdt:P136 ?genre.
          ?genre rdfs:label ?genreLabel.
          FILTER(LANG(?genreLabel)="en")
        }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }
      GROUP BY ?lookup ?mode ?id ?item ?itemLabel ?itemDescription ?date ?image ?imdb ?movieTmdb ?tvTmdb ?article`;
  }

  metadataQuery = metadataQueryWithArticle;
  bulkMetadataQuery = bulkMetadataQueryWithArticle;
  metadataFromBinding = function enhancedMetadataFromBinding(entry, binding) {
    const metadata = originalMetadataFromBinding(entry, binding);
    return {
      ...metadata,
      article: bindingValue(binding, "article") || metadata.article || ""
    };
  };

  async function fetchWikipediaMetadata(articleUrl) {
    const title = articleTitle(articleUrl);
    if (!title) return null;

    const url = new URL("https://en.wikipedia.org/w/api.php");
    url.searchParams.set("action", "query");
    url.searchParams.set("prop", "pageimages|extracts|info");
    url.searchParams.set("inprop", "url");
    url.searchParams.set("redirects", "1");
    url.searchParams.set("exintro", "1");
    url.searchParams.set("explaintext", "1");
    url.searchParams.set("pithumbsize", "700");
    url.searchParams.set("titles", title);
    url.searchParams.set("format", "json");
    url.searchParams.set("origin", "*");

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Wikipedia metadata failed (${response.status}).`);
    const payload = await response.json();
    const page = Object.values(payload?.query?.pages || {})[0];
    if (!page || page.missing !== undefined) return null;

    return {
      title: page.title || "",
      description: page.extract || "",
      image: page.thumbnail?.source || "",
      wikipedia: page.fullurl || articleUrl
    };
  }

  function mergeWikipediaMetadata(entry, metadata, wikipedia) {
    if (!wikipedia) return metadata;
    const title = isGenericTitle(entry, metadata.title) ? wikipedia.title || metadata.title : metadata.title;
    return {
      ...metadata,
      title,
      description: metadata.description || wikipedia.description || "",
      image: metadata.image || wikipedia.image || "",
      wikipedia: wikipedia.wikipedia || metadata.article || "",
      resolutionStatus: metadata.wikidata || wikipedia.title ? "resolved" : metadata.resolutionStatus,
      resolvedAt: new Date().toISOString()
    };
  }

  async function enrichMetadata(entry, metadata) {
    if (!needsMetadataRepair({ ...entry, ...metadata }) || !metadata.article) return metadata;
    try {
      return mergeWikipediaMetadata(entry, metadata, await fetchWikipediaMetadata(metadata.article));
    } catch {
      return metadata;
    }
  }

  resolveMetadata = async function enhancedResolveMetadata(entry, quiet = false) {
    const metadata = await originalResolveMetadata(entry, quiet);
    const enriched = await enrichMetadata(entry, metadata);

    if (enriched !== metadata && isCurrentEntry(entry)) {
      state.currentMetadata = enriched;
      state.currentMetadataKey = entryKey(entry);
      renderCurrent(entry, enriched);
      await loadRelated(entry, enriched);
      if (!quiet) setStatus(`Resolved: ${enriched.title}`, "ok");
    }

    return enriched;
  };

  async function mapLimit(items, limit, worker) {
    let cursor = 0;
    const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++;
        await worker(items[index], index);
      }
    });
    await Promise.all(runners);
  }

  async function repairSelectedMetadata() {
    let entries = selectedEntries(await getAll(FAVORITES_STORE));
    entries = entries.filter(needsMetadataRepair);
    if (!entries.length) return 0;

    let repaired = 0;
    setStatus(`Repairing names and cover art for ${entries.length} item${entries.length === 1 ? "" : "s"}…`);
    await mapLimit(entries, 3, async entry => {
      const data = await runSparql(metadataQuery(entry));
      let metadata = metadataFromBinding(entry, data.results.bindings[0]);
      metadata = await enrichMetadata(entry, metadata);
      await putValue(FAVORITES_STORE, { ...entry, ...metadata, updatedAt: new Date().toISOString() });
      const history = await getValue(HISTORY_STORE, entry.key);
      if (history) await putValue(HISTORY_STORE, { ...history, ...metadata });
      repaired += 1;
    });
    return repaired;
  }

  resolveSelectedList = async function enhancedResolveSelectedList() {
    await originalResolveSelectedList();
    const button = $("#resolveListButton");
    button.disabled = true;
    try {
      const repaired = await repairSelectedMetadata();
      if (repaired) {
        await renderListControls();
        await renderLibrary();
        await renderContinueWatching();
        setStatus(`Repaired names or cover art for ${repaired} item${repaired === 1 ? "" : "s"}.`, "ok");
      }
    } catch (error) {
      setStatus(`Metadata repair stopped: ${error.message}`, "warn");
    } finally {
      button.disabled = false;
    }
  };

  function candidateKey(candidate) {
    return `${candidate.mode}|${candidate.id}|${candidate.season || ""}|${candidate.episode || ""}`;
  }

  function recommendationCandidates(favorites, history, related, baseUrl) {
    const candidates = [];
    const seen = new Set();
    const add = candidate => {
      if (!candidate?.id) return;
      const key = candidateKey(candidate);
      if (seen.has(key)) return;
      seen.add(key);
      candidates.push(candidate);
    };

    favorites
      .filter(entry => entry.resolutionStatus === "resolved" || entry.title)
      .forEach(entry => add({ ...entry, source: "Library", known: true }));
    history
      .filter(entry => !entry.completed)
      .forEach(entry => add({ ...entry, source: "Continue", known: true }));
    related.forEach(item => {
      const id = item.imdb || item.tmdb;
      if (!id) return;
      add({
        ...item,
        id,
        baseUrl,
        season: item.mode === "tv" ? 1 : undefined,
        episode: item.mode === "tv" ? 1 : undefined,
        source: "Related",
        known: false
      });
    });

    return candidates;
  }

  function chooseRandomCandidate(candidates, currentKey = "", random = Math.random) {
    const known = candidates.filter(candidate => candidate.known && candidateKey(candidate) !== currentKey);
    const pool = known.length ? known : candidates.filter(candidate => candidateKey(candidate) !== currentKey);
    if (!pool.length) return null;
    return pool[Math.floor(random() * pool.length)];
  }

  function recommendationCard(candidate, index) {
    const modeText = candidate.mode === "movie" ? "Movie" : `TV · S${candidate.season || 1} E${candidate.episode || 1}`;
    const actionText = candidate.known ? "Play" : "Try ID";
    return `<article class="card">${posterMarkup(candidate)}<div class="card-body">
      <h3 class="card-title" title="${escapeHtml(candidate.title || fallbackTitle(candidate))}">${escapeHtml(candidate.title || fallbackTitle(candidate))}</h3>
      <div class="card-meta"><span>${escapeHtml(modeText)}</span>${candidate.year ? `<span>${escapeHtml(candidate.year)}</span>` : ""}<span>${escapeHtml(candidate.source)}</span></div>
      <div class="tags">${candidate.known ? '<span class="tag">Known item</span>' : '<span class="tag">Availability unknown</span>'}</div>
      <div class="card-actions"><button class="mini" type="button" data-recommend-index="${index}">${actionText}</button></div>
    </div></article>`;
  }

  async function renderRecommendations() {
    const container = $("#recommendedCards");
    const randomButton = $("#randomButton");
    if (!container || !randomButton) return;

    try {
      const [favorites, history] = await Promise.all([
        getAll(FAVORITES_STORE),
        getAll(HISTORY_STORE)
      ]);
      recommendationState.entries = recommendationCandidates(
        favorites,
        history,
        state.related || [],
        baseUrlInput.value || "https://vidcore.net"
      );
      randomButton.disabled = recommendationState.entries.length === 0;
      container.innerHTML = recommendationState.entries.length
        ? recommendationState.entries.map(recommendationCard).join("")
        : '<div class="empty-list">Resolve a title, save favorites, or play something to build recommendations.</div>';
    } catch (error) {
      container.innerHTML = `<div class="empty-list">Recommendations unavailable: ${escapeHtml(error.message)}</div>`;
      randomButton.disabled = true;
    }
  }

  function queueRecommendationRefresh() {
    if (recommendationState.refreshQueued) return;
    recommendationState.refreshQueued = true;
    queueMicrotask(() => {
      recommendationState.refreshQueued = false;
      renderRecommendations();
    });
  }

  renderRelated = function enhancedRenderRelated() {
    const result = originalRenderRelated();
    queueRecommendationRefresh();
    return result;
  };

  renderLibrary = async function enhancedRenderLibrary() {
    const result = await originalRenderLibrary();
    queueRecommendationRefresh();
    return result;
  };

  renderContinueWatching = async function enhancedRenderContinueWatching() {
    const result = await originalRenderContinueWatching();
    queueRecommendationRefresh();
    return result;
  };

  showPanel = function enhancedShowPanel(panel) {
    originalShowPanel(panel);
    $("#recommendedPanel")?.classList.toggle("hidden", panel !== "recommended");
  };

  $("#recommendedCards")?.addEventListener("click", event => {
    const button = event.target.closest("[data-recommend-index]");
    if (!button) return;
    const candidate = recommendationState.entries[Number(button.dataset.recommendIndex)];
    if (candidate) play(candidate);
  });

  $("#randomButton")?.addEventListener("click", async () => {
    await renderRecommendations();
    const current = currentEntrySafe();
    const candidate = chooseRandomCandidate(recommendationState.entries, candidateKey(current));
    if (!candidate) {
      setStatus("No recommendation candidates are available yet.", "warn");
      return;
    }
    setStatus(`Random pick: ${candidate.title || fallbackTitle(candidate)}.`, "ok");
    play(candidate);
  });

  if (state.storageReady) {
    state.storageReady.then(renderRecommendations).catch(() => {});
  } else {
    window.setTimeout(renderRecommendations, 0);
  }

  window.VidCoreDiscovery = {
    isGenericTitle,
    needsMetadataRepair,
    mergeWikipediaMetadata,
    recommendationCandidates,
    chooseRandomCandidate
  };
})();
