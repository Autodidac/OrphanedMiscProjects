"use strict";

const DB_NAME="vidcore-library";
const DB_VERSION=2;
const FAVORITES_STORE="favorites";
const LISTS_STORE="lists";
const HISTORY_STORE="history";
const LEGACY_KEY="vidcoreLargePlayer.favorites";
const SETTINGS_PREFIX="vidcoreLibrary.";
const state={db:null,selectedList:"All",currentMetadata:null,currentMetadataKey:"",related:[],lists:["Favorites"],activePanel:"library"};

const $=selector=>document.querySelector(selector);
const baseUrlInput=$("#baseUrl");
const modeSelect=$("#mode");
const mediaIdInput=$("#mediaId");
const seasonInput=$("#season");
const episodeInput=$("#episode");
const player=$("#player");
const emptyPlayer=$("#emptyPlayer");
const statusElement=$("#status");

function setStatus(message,type=""){statusElement.textContent=message;statusElement.className=`status ${type}`.trim()}
function requestPromise(request){return new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
function transactionDone(transaction){return new Promise((resolve,reject)=>{transaction.oncomplete=resolve;transaction.onerror=()=>reject(transaction.error);transaction.onabort=()=>reject(transaction.error)})}
async function openDatabase(){
  const request=indexedDB.open(DB_NAME,DB_VERSION);
  request.onupgradeneeded=()=>{
    const db=request.result;
    if(!db.objectStoreNames.contains(FAVORITES_STORE)){
      const favorites=db.createObjectStore(FAVORITES_STORE,{keyPath:"key"});
      favorites.createIndex("list","list",{unique:false});
      favorites.createIndex("title","title",{unique:false});
    }
    if(!db.objectStoreNames.contains(LISTS_STORE))db.createObjectStore(LISTS_STORE,{keyPath:"name"});
    if(!db.objectStoreNames.contains(HISTORY_STORE)){
      const history=db.createObjectStore(HISTORY_STORE,{keyPath:"key"});
      history.createIndex("lastPlayedAt","lastPlayedAt",{unique:false});
    }
  };
  state.db=await requestPromise(request);
  await ensureDefaultList();
  await migrateLegacyFavorites();
}
async function ensureDefaultList(){
  const transaction=state.db.transaction(LISTS_STORE,"readwrite");
  const store=transaction.objectStore(LISTS_STORE);
  const existing=await requestPromise(store.get("Favorites"));
  if(!existing)store.put({name:"Favorites",createdAt:new Date().toISOString()});
  await transactionDone(transaction);
}
async function migrateLegacyFavorites(){
  const raw=localStorage.getItem(LEGACY_KEY);
  if(!raw)return;
  try{
    const entries=JSON.parse(raw);
    if(!Array.isArray(entries))return;
    const transaction=state.db.transaction(FAVORITES_STORE,"readwrite");
    const store=transaction.objectStore(FAVORITES_STORE);
    for(const entry of entries){
      store.put({...entry,key:entryKey(entry),title:entry.title||fallbackTitle(entry),list:"Favorites",notes:"",watched:false,createdAt:entry.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()});
    }
    await transactionDone(transaction);
    localStorage.removeItem(LEGACY_KEY);
    setStatus("Migrated old favorites into IndexedDB.","ok");
  }catch{setStatus("Old favorites could not be migrated.","warn")}
}
async function getAll(storeName){
  const transaction=state.db.transaction(storeName,"readonly");
  const result=await requestPromise(transaction.objectStore(storeName).getAll());
  await transactionDone(transaction);
  return result;
}
async function getValue(storeName,key){
  const transaction=state.db.transaction(storeName,"readonly");
  const result=await requestPromise(transaction.objectStore(storeName).get(key));
  await transactionDone(transaction);
  return result;
}
async function putValue(storeName,value){
  const transaction=state.db.transaction(storeName,"readwrite");
  transaction.objectStore(storeName).put(value);
  await transactionDone(transaction);
}
async function deleteValue(storeName,key){
  const transaction=state.db.transaction(storeName,"readwrite");
  transaction.objectStore(storeName).delete(key);
  await transactionDone(transaction);
}

function normalizeBaseUrl(value){
  const url=new URL(value.trim());
  if(url.protocol!=="https:")throw new Error("Base URL must use HTTPS.");
  return url.origin+url.pathname.replace(/\/+$/,"");
}
function normalizeId(value){
  const input=value.trim();
  const imdb=input.match(/tt\d{7,10}/i);
  if(imdb)return imdb[0].toLowerCase();
  if(/^\d+$/.test(input))return String(Number.parseInt(input,10));
  throw new Error("Use a numeric TMDB ID or IMDb tt… ID.");
}
function readInteger(value,label,minimum){
  const parsed=Number.parseInt(value,10);
  if(!Number.isInteger(parsed)||parsed<minimum)throw new Error(`${label} must be ${minimum} or higher.`);
  return parsed;
}
function currentEntry(){
  const baseUrl=normalizeBaseUrl(baseUrlInput.value);
  const mode=modeSelect.value;
  const id=normalizeId(mediaIdInput.value);
  if(mode==="movie")return{baseUrl,mode,id};
  return{baseUrl,mode,id,season:readInteger(seasonInput.value,"Season",0),episode:readInteger(episodeInput.value,"Episode",1)};
}
function currentEntrySafe(){
  try{return currentEntry()}catch{return{baseUrl:baseUrlInput.value||"https://vidcore.net",mode:modeSelect.value,id:mediaIdInput.value||"1",season:Number.parseInt(seasonInput.value,10)||1,episode:Number.parseInt(episodeInput.value,10)||1}}
}
function entryKey(entry){
  return entry.mode==="movie"?`${entry.baseUrl}|movie|${entry.id}`:`${entry.baseUrl}|tv|${entry.id}|${entry.season}|${entry.episode}`;
}
function fallbackTitle(entry){return entry.mode==="movie"?`Movie ${entry.id}`:`TV ${entry.id} · S${entry.season} E${entry.episode}`}
function buildPlayerUrl(entry){
  const path=entry.mode==="movie"?`/movie/${encodeURIComponent(entry.id)}`:`/tv/${encodeURIComponent(entry.id)}/${entry.season}/${entry.episode}`;
  const url=new URL(entry.baseUrl+path);
  url.searchParams.set("autoPlay","false");
  url.searchParams.set("title","true");
  url.searchParams.set("poster","true");
  url.searchParams.set("fullscreenButton","true");
  return url.href;
}
function saveSettings(entry){
  localStorage.setItem(`${SETTINGS_PREFIX}baseUrl`,entry.baseUrl);
  localStorage.setItem(`${SETTINGS_PREFIX}mode`,entry.mode);
  localStorage.setItem(`${SETTINGS_PREFIX}mediaId`,entry.id);
  if(entry.mode==="tv"){
    localStorage.setItem(`${SETTINGS_PREFIX}season`,String(entry.season));
    localStorage.setItem(`${SETTINGS_PREFIX}episode`,String(entry.episode));
  }
}
function escapeHtml(value){
  return String(value??"").replace(/[&<>"']/g,character=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[character]);
}
function sparqlLiteral(value){return`"${String(value).replaceAll("\\","\\\\").replaceAll('"','\\"')}"`}
function bindingValue(binding,key){return binding?.[key]?.value||""}
function metadataFromBinding(entry,binding){
  if(!binding)return{
    title:fallbackTitle(entry),description:"No matching Wikidata metadata was found.",year:"",image:"",
    imdb:/^tt\d+$/i.test(entry.id)?entry.id:"",tmdb:/^\d+$/.test(entry.id)?entry.id:"",
    genres:[],genreUris:[],wikidata:"",resolutionStatus:"not-found",resolvedAt:new Date().toISOString()
  };
  return{
    title:bindingValue(binding,"itemLabel")||fallbackTitle(entry),
    description:bindingValue(binding,"itemDescription"),
    year:bindingValue(binding,"date").slice(0,4),
    image:bindingValue(binding,"image").replace(/^http:/,"https:"),
    imdb:bindingValue(binding,"imdb"),
    tmdb:entry.mode==="movie"?bindingValue(binding,"movieTmdb"):bindingValue(binding,"tvTmdb"),
    genres:bindingValue(binding,"genres").split("|").filter(Boolean),
    genreUris:bindingValue(binding,"genreUris").split("|").filter(Boolean),
    wikidata:bindingValue(binding,"item"),
    resolutionStatus:"resolved",
    resolvedAt:new Date().toISOString()
  };
}
function metadataQuery(entry){
  const identifierPattern=/^tt\d+$/i.test(entry.id)
    ?`?item wdt:P345 ${sparqlLiteral(entry.id)}.`
    :entry.mode==="movie"
      ?`?item wdt:P4947 ${sparqlLiteral(entry.id)}.`
      :`?item wdt:P4983 ${sparqlLiteral(entry.id)}.`;
  return`SELECT ?item ?itemLabel ?itemDescription ?date ?image ?imdb ?movieTmdb ?tvTmdb (GROUP_CONCAT(DISTINCT ?genreLabel; separator="|") AS ?genres) (GROUP_CONCAT(DISTINCT STR(?genre); separator="|") AS ?genreUris) WHERE { ${identifierPattern} OPTIONAL { ?item wdt:P577 ?date. } OPTIONAL { ?item wdt:P18 ?image. } OPTIONAL { ?item wdt:P345 ?imdb. } OPTIONAL { ?item wdt:P4947 ?movieTmdb. } OPTIONAL { ?item wdt:P4983 ?tvTmdb. } OPTIONAL { ?item wdt:P136 ?genre. ?genre rdfs:label ?genreLabel. FILTER(LANG(?genreLabel)="en") } SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } } GROUP BY ?item ?itemLabel ?itemDescription ?date ?image ?imdb ?movieTmdb ?tvTmdb LIMIT 1`;
}
async function runSparql(query){
  const url=new URL("https://query.wikidata.org/sparql");
  url.searchParams.set("query",query);
  url.searchParams.set("format","json");
  url.searchParams.set("origin","*");
  const response=await fetch(url,{headers:{Accept:"application/sparql-results+json"}});
  if(!response.ok)throw new Error(`Metadata request failed (${response.status}).`);
  return response.json();
}
async function resolveMetadata(entry,quiet=false){
  if(!quiet)setStatus(`Resolving ${fallbackTitle(entry)}…`);
  const data=await runSparql(metadataQuery(entry));
  const metadata=metadataFromBinding(entry,data.results.bindings[0]);
  state.currentMetadata=metadata;
  state.currentMetadataKey=entryKey(entry);
  renderCurrent(entry,metadata);
  await loadRelated(entry,metadata);
  if(!quiet)setStatus(metadata.resolutionStatus==="resolved"?`Resolved: ${metadata.title}`:"No metadata match found.",metadata.resolutionStatus==="resolved"?"ok":"warn");
  return metadata;
}

function bulkMetadataQuery(entries){
  const rows=entries.map((entry,index)=>`(${sparqlLiteral(String(index))} ${sparqlLiteral(entry.mode)} ${sparqlLiteral(entry.id)})`).join(" ");
  return`SELECT ?lookup ?mode ?id ?item ?itemLabel ?itemDescription ?date ?image ?imdb ?movieTmdb ?tvTmdb (GROUP_CONCAT(DISTINCT ?genreLabel; separator="|") AS ?genres) (GROUP_CONCAT(DISTINCT STR(?genre); separator="|") AS ?genreUris) WHERE {
    VALUES (?lookup ?mode ?id) { ${rows} }
    { FILTER(STRSTARTS(?id,"tt")) ?item wdt:P345 ?id. }
    UNION { FILTER(?mode="movie" && !STRSTARTS(?id,"tt")) ?item wdt:P4947 ?id. }
    UNION { FILTER(?mode="tv" && !STRSTARTS(?id,"tt")) ?item wdt:P4983 ?id. }
    OPTIONAL { ?item wdt:P577 ?date. }
    OPTIONAL { ?item wdt:P18 ?image. }
    OPTIONAL { ?item wdt:P345 ?imdb. }
    OPTIONAL { ?item wdt:P4947 ?movieTmdb. }
    OPTIONAL { ?item wdt:P4983 ?tvTmdb. }
    OPTIONAL { ?item wdt:P136 ?genre. ?genre rdfs:label ?genreLabel. FILTER(LANG(?genreLabel)="en") }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
  } GROUP BY ?lookup ?mode ?id ?item ?itemLabel ?itemDescription ?date ?image ?imdb ?movieTmdb ?tvTmdb`;
}
async function resolveSelectedList(){
  let entries=await getAll(FAVORITES_STORE);
  if(state.selectedList!=="All")entries=entries.filter(entry=>entry.list===state.selectedList);
  if(!entries.length){setStatus("Nothing in this list to resolve.","warn");return}
  const unresolved=entries.filter(entry=>!entry.resolvedAt||entry.resolutionStatus!=="resolved");
  if(!unresolved.length){setStatus("Every item in this list is already resolved.","ok");return}
  const batchSize=20;
  let completed=0;
  $("#resolveListButton").disabled=true;
  try{
    for(let offset=0;offset<unresolved.length;offset+=batchSize){
      const batch=unresolved.slice(offset,offset+batchSize);
      setStatus(`Resolving ${completed}/${unresolved.length}…`);
      const data=await runSparql(bulkMetadataQuery(batch));
      const bindingsByIndex=new Map(data.results.bindings.map(binding=>[Number(bindingValue(binding,"lookup")),binding]));
      for(let index=0;index<batch.length;index++){
        const entry=batch[index];
        const metadata=metadataFromBinding(entry,bindingsByIndex.get(index));
        await putValue(FAVORITES_STORE,{...entry,...metadata,updatedAt:new Date().toISOString()});
        const history=await getValue(HISTORY_STORE,entry.key);
        if(history)await putValue(HISTORY_STORE,{...history,...metadata});
        completed++;
      }
    }
    await renderLibrary();
    await renderContinueWatching();
    setStatus(`Resolved ${completed} item${completed===1?"":"s"} in ${state.selectedList}.`,"ok");
  }catch(error){setStatus(`Bulk resolver stopped after ${completed}: ${error.message}`,"error")}
  finally{$("#resolveListButton").disabled=false}
}

function renderCurrent(entry,metadata=null){
  const title=metadata?.title||fallbackTitle(entry);
  $("#currentTitle").textContent=title;
  const meta=[entry.mode==="movie"?"Movie":`TV · S${entry.season} E${entry.episode}`];
  if(metadata?.year)meta.push(metadata.year);
  if(metadata?.genres?.length)meta.push(metadata.genres.slice(0,3).join(" · "));
  meta.push(entry.id);
  $("#currentMeta").innerHTML=meta.map(value=>`<span>${escapeHtml(value)}</span>`).join("");
  $("#currentDescription").textContent=metadata?.description||"Press Resolve to load available public metadata.";
  const poster=$("#currentPoster");
  if(metadata?.image){
    poster.className="current-poster";
    poster.textContent="";
    poster.style.backgroundImage=`url("${metadata.image.replaceAll('"',"%22")}")`;
    poster.style.backgroundSize="cover";
    poster.style.backgroundPosition="center";
  }else{
    poster.className="current-poster fallback";
    poster.style.backgroundImage="";
    poster.textContent=entry.mode==="movie"?"M":"TV";
  }
  configureExternalLink($("#currentImdb"),metadata?.imdb?`https://www.imdb.com/title/${encodeURIComponent(metadata.imdb)}/`:"");
  configureExternalLink($("#currentTmdb"),metadata?.tmdb?`https://www.themoviedb.org/${entry.mode}/${encodeURIComponent(metadata.tmdb)}`:"");
}
function configureExternalLink(element,href){
  element.classList.toggle("hidden",!href);
  if(href)element.href=href;else element.removeAttribute("href");
}
async function recordHistory(entry,metadata=null,increment=true){
  const existing=await getValue(HISTORY_STORE,entryKey(entry));
  const now=new Date().toISOString();
  const history={
    ...existing,...entry,key:entryKey(entry),
    title:metadata?.title||existing?.title||fallbackTitle(entry),
    description:metadata?.description||existing?.description||"",
    year:metadata?.year||existing?.year||"",
    image:metadata?.image||existing?.image||"",
    imdb:metadata?.imdb||existing?.imdb||"",
    tmdb:metadata?.tmdb||existing?.tmdb||"",
    genres:metadata?.genres||existing?.genres||[],
    genreUris:metadata?.genreUris||existing?.genreUris||[],
    wikidata:metadata?.wikidata||existing?.wikidata||"",
    lastPlayedAt:now,
    playCount:(existing?.playCount||0)+(increment?1:0),
    completed:false
  };
  await putValue(HISTORY_STORE,history);
}
async function play(entry=currentEntry()){
  try{
    baseUrlInput.value=entry.baseUrl;
    modeSelect.value=entry.mode;
    mediaIdInput.value=entry.id;
    if(entry.mode==="tv"){seasonInput.value=entry.season;episodeInput.value=entry.episode}
    updateModeFields();
    saveSettings(entry);
    player.src=buildPlayerUrl(entry);
    player.classList.remove("hidden");
    emptyPlayer.classList.add("hidden");
    state.currentMetadata=null;
    state.currentMetadataKey="";
    state.related=[];
    renderCurrent(entry);
    renderRelated();
    await recordHistory(entry);
    await renderContinueWatching();
    setStatus(`Loaded ${fallbackTitle(entry)}.`);
    resolveMetadata(entry,true).then(async metadata=>{
      await recordHistory(entry,metadata,false);
      const favorite=await getValue(FAVORITES_STORE,entryKey(entry));
      if(favorite)await putValue(FAVORITES_STORE,{...favorite,...metadata,updatedAt:new Date().toISOString()});
      await renderLibrary();
      await renderContinueWatching();
    }).catch(()=>setStatus("Player loaded; metadata lookup failed.","warn"));
  }catch(error){setStatus(error.message,"error")}
}
function step(direction){
  try{
    const entry=currentEntry();
    if(entry.mode==="movie"){
      if(!/^\d+$/.test(entry.id))throw new Error("Previous/Next requires a numeric movie ID.");
      const nextId=Number.parseInt(entry.id,10)+direction;
      if(nextId<1)throw new Error("Movie ID cannot go below 1.");
      entry.id=String(nextId);
    }else{
      const nextEpisode=entry.episode+direction;
      if(nextEpisode<1)throw new Error("Episode cannot go below 1.");
      entry.episode=nextEpisode;
    }
    play(entry);
  }catch(error){setStatus(error.message,"error")}
}

async function loadLists(){
  const rows=await getAll(LISTS_STORE);
  state.lists=rows.map(row=>row.name).sort((a,b)=>a.localeCompare(b));
  if(!state.lists.includes("Favorites"))state.lists.unshift("Favorites");
  await renderListControls();
}
async function renderListControls(){
  const favorites=await getAll(FAVORITES_STORE);
  const counts=new Map([["All",favorites.length]]);
  for(const name of state.lists)counts.set(name,favorites.filter(entry=>entry.list===name).length);
  const chips=["All",...state.lists];
  $("#listChips").innerHTML=chips.map(name=>`<button class="list-chip ${name===state.selectedList?"active":""}" type="button" data-list="${escapeHtml(name)}">${escapeHtml(name)} · ${counts.get(name)||0}</button>`).join("");
  $("#saveList").innerHTML=state.lists.map(name=>`<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
}
async function addList(){
  const input=$("#newListName");
  const name=input.value.trim();
  if(!name)return;
  if(name.toLowerCase()==="all"){setStatus('"All" is reserved.',"error");return}
  await putValue(LISTS_STORE,{name,createdAt:new Date().toISOString()});
  input.value="";
  await loadLists();
  setStatus(`Created list: ${name}`,"ok");
}
async function openSaveDialog(){
  try{
    const entry=currentEntry();
    if(!state.currentMetadata||state.currentMetadataKey!==entryKey(entry))await resolveMetadata(entry);
    $("#saveNotes").value="";
    $("#saveDialog").showModal();
  }catch(error){setStatus(error.message,"error")}
}
async function saveCurrentFavorite(event){
  event.preventDefault();
  try{
    const entry=currentEntry();
    const metadata=state.currentMetadataKey===entryKey(entry)?state.currentMetadata:await resolveMetadata(entry);
    const existing=await getValue(FAVORITES_STORE,entryKey(entry));
    const now=new Date().toISOString();
    const saved={
      ...existing,...entry,...metadata,key:entryKey(entry),
      list:$("#saveList").value||"Favorites",
      notes:$("#saveNotes").value.trim(),
      watched:existing?.watched||false,
      createdAt:existing?.createdAt||now,
      updatedAt:now
    };
    await putValue(FAVORITES_STORE,saved);
    $("#saveDialog").close();
    await renderListControls();
    await renderLibrary();
    setStatus(`Saved ${saved.title} to ${saved.list}.`,"ok");
  }catch(error){setStatus(error.message,"error")}
}
function selectedEntries(entries){
  return state.selectedList==="All"?entries:entries.filter(entry=>entry.list===state.selectedList);
}
async function renderLibrary(){
  const search=$("#librarySearch").value.trim().toLowerCase();
  let entries=selectedEntries(await getAll(FAVORITES_STORE));
  if(search)entries=entries.filter(entry=>
    (entry.title||"").toLowerCase().includes(search)||
    entry.id.toLowerCase().includes(search)||
    entry.list.toLowerCase().includes(search)||
    (entry.notes||"").toLowerCase().includes(search)
  );
  entries.sort((a,b)=>(b.updatedAt||"").localeCompare(a.updatedAt||""));
  const container=$("#libraryCards");
  if(!entries.length){container.innerHTML='<div class="empty-list">Nothing saved in this view.</div>';return}
  container.innerHTML=entries.map(entry=>libraryCard(entry)).join("");
}
function posterMarkup(entry,className="card-poster"){
  if(!entry.image)return`<div class="${className} fallback">${entry.mode==="tv"?"TV":"M"}</div>`;
  return`<img class="${className}" src="${escapeHtml(entry.image)}" alt="" loading="lazy">`;
}
function libraryCard(entry){
  const modeText=entry.mode==="movie"?"Movie":`S${entry.season} E${entry.episode}`;
  const unresolved=entry.resolutionStatus!=="resolved";
  return`<article class="card">${posterMarkup(entry)}<div class="card-body">
    <h3 class="card-title" title="${escapeHtml(entry.title||fallbackTitle(entry))}">${escapeHtml(entry.title||fallbackTitle(entry))}</h3>
    <div class="card-meta"><span>${escapeHtml(modeText)}</span>${entry.year?`<span>${escapeHtml(entry.year)}</span>`:""}<span>${escapeHtml(entry.list)}</span>${unresolved?'<span>Unresolved</span>':""}</div>
    <div class="tags">${(entry.genres||[]).slice(0,3).map(genre=>`<span class="tag">${escapeHtml(genre)}</span>`).join("")}</div>
    <div class="card-actions">
      <button class="mini" type="button" data-play-key="${escapeHtml(entry.key)}">Play</button>
      ${unresolved?`<button class="mini" type="button" data-resolve-key="${escapeHtml(entry.key)}">Resolve</button>`:""}
      <button class="mini ${entry.watched?"watched":""}" type="button" data-watch-key="${escapeHtml(entry.key)}">${entry.watched?"Watched":"Mark watched"}</button>
      <button class="mini" type="button" data-remove-key="${escapeHtml(entry.key)}">Remove</button>
    </div>
  </div></article>`;
}
async function toggleWatched(key){
  const entry=await getValue(FAVORITES_STORE,key);
  if(!entry)return;
  entry.watched=!entry.watched;
  entry.updatedAt=new Date().toISOString();
  await putValue(FAVORITES_STORE,entry);
  await renderLibrary();
}
async function markSelectedListWatched(){
  const entries=selectedEntries(await getAll(FAVORITES_STORE));
  if(!entries.length){setStatus("Nothing in this list.","warn");return}
  const now=new Date().toISOString();
  for(const entry of entries)await putValue(FAVORITES_STORE,{...entry,watched:true,updatedAt:now});
  await renderLibrary();
  setStatus(`Marked ${entries.length} item${entries.length===1?"":"s"} watched.`,"ok");
}
async function resolveOneFavorite(key){
  const entry=await getValue(FAVORITES_STORE,key);
  if(!entry)return;
  const metadata=await resolveMetadata(entry);
  await putValue(FAVORITES_STORE,{...entry,...metadata,updatedAt:new Date().toISOString()});
  await renderLibrary();
  await renderListControls();
}

async function renderContinueWatching(){
  let entries=await getAll(HISTORY_STORE);
  entries=entries.filter(entry=>!entry.completed).sort((a,b)=>(b.lastPlayedAt||"").localeCompare(a.lastPlayedAt||"")).slice(0,30);
  const container=$("#continueCards");
  if(!entries.length){container.innerHTML='<div class="empty-list">Play a title to add it here.</div>';return}
  container.innerHTML=entries.map(entry=>continueCard(entry)).join("");
}
function continueCard(entry){
  const modeText=entry.mode==="movie"?"Movie":`S${entry.season} E${entry.episode}`;
  return`<article class="card">${posterMarkup(entry)}<div class="card-body">
    <h3 class="card-title">${escapeHtml(entry.title||fallbackTitle(entry))}</h3>
    <div class="card-meta"><span>${escapeHtml(modeText)}</span>${entry.year?`<span>${escapeHtml(entry.year)}</span>`:""}<span>Played ${entry.playCount||1}×</span></div>
    <div class="card-actions">
      <button class="mini" type="button" data-continue-play="${escapeHtml(entry.key)}">Continue</button>
      <button class="mini" type="button" data-continue-done="${escapeHtml(entry.key)}">Finished</button>
      <button class="mini" type="button" data-continue-remove="${escapeHtml(entry.key)}">Remove</button>
    </div>
  </div></article>`;
}
async function completeHistory(key){
  const entry=await getValue(HISTORY_STORE,key);
  if(!entry)return;
  await putValue(HISTORY_STORE,{...entry,completed:true});
  await renderContinueWatching();
}

function qidFromUri(uri){return uri.split("/").pop()}
function relatedQuery(entry,metadata){
  const genreIds=metadata.genreUris.map(qidFromUri).filter(id=>/^Q\d+$/.test(id)).slice(0,3);
  if(!genreIds.length||!metadata.wikidata)return"";
  const type=entry.mode==="movie"?"wd:Q11424":"wd:Q5398426";
  const tmdbProperty=entry.mode==="movie"?"wdt:P4947":"wdt:P4983";
  const values=genreIds.map(id=>`wd:${id}`).join(" ");
  return`SELECT DISTINCT ?item ?itemLabel ?date ?image ?imdb ?tmdb WHERE { VALUES ?genre { ${values} } ?item wdt:P31/wdt:P279* ${type}; wdt:P136 ?genre. FILTER(?item != <${metadata.wikidata}>) OPTIONAL { ?item wdt:P577 ?date. } OPTIONAL { ?item wdt:P18 ?image. } OPTIONAL { ?item wdt:P345 ?imdb. } OPTIONAL { ?item ${tmdbProperty} ?tmdb. } SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } } ORDER BY DESC(?date) LIMIT 16`;
}
async function loadRelated(entry,metadata){
  const query=relatedQuery(entry,metadata);
  if(!query){state.related=[];renderRelated();return}
  try{
    const data=await runSparql(query);
    const seen=new Set();
    state.related=data.results.bindings.map(binding=>({
      title:bindingValue(binding,"itemLabel"),
      year:bindingValue(binding,"date").slice(0,4),
      image:bindingValue(binding,"image").replace(/^http:/,"https:"),
      imdb:bindingValue(binding,"imdb"),
      tmdb:bindingValue(binding,"tmdb"),
      mode:entry.mode
    })).filter(item=>item.title&&!seen.has(item.title)&&seen.add(item.title)).slice(0,10);
  }catch{state.related=[]}
  renderRelated();
}
function renderRelated(){
  const container=$("#relatedCards");
  if(!state.related.length){container.innerHTML='<div class="empty-list">Resolve a title with genre metadata to load related results.</div>';return}
  container.innerHTML=state.related.map(item=>{
    const primaryId=item.imdb||item.tmdb;
    const imdbUrl=item.imdb?`https://www.imdb.com/title/${encodeURIComponent(item.imdb)}/`:"";
    const tmdbUrl=item.tmdb?`https://www.themoviedb.org/${item.mode}/${encodeURIComponent(item.tmdb)}`:"";
    return`<article class="card related-card">${posterMarkup(item)}<div class="card-body">
      <h3 class="card-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</h3>
      <div class="card-meta">${item.year?`<span>${escapeHtml(item.year)}</span>`:""}</div>
      <div class="card-actions">
        ${primaryId?`<button class="mini" type="button" data-copy-id="${escapeHtml(primaryId)}">Use ID</button>`:""}
        ${imdbUrl?`<a class="mini" href="${imdbUrl}" target="_blank" rel="noopener noreferrer">IMDb</a>`:""}
        ${tmdbUrl?`<a class="mini" href="${tmdbUrl}" target="_blank" rel="noopener noreferrer">TMDB</a>`:""}
      </div>
    </div></article>`;
  }).join("");
}

async function exportLibrary(){
  const payload={
    version:2,exportedAt:new Date().toISOString(),
    favorites:await getAll(FAVORITES_STORE),
    lists:await getAll(LISTS_STORE),
    history:await getAll(HISTORY_STORE)
  };
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement("a");
  anchor.href=url;
  anchor.download=`vidcore-library-${new Date().toISOString().slice(0,10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  setStatus("Library exported.","ok");
}
async function importLibrary(file){
  const payload=JSON.parse(await file.text());
  if(!Array.isArray(payload.favorites)||!Array.isArray(payload.lists))throw new Error("Invalid library export.");
  for(const list of payload.lists)if(list?.name)await putValue(LISTS_STORE,list);
  for(const favorite of payload.favorites)if(favorite?.key)await putValue(FAVORITES_STORE,favorite);
  for(const history of payload.history||[])if(history?.key)await putValue(HISTORY_STORE,history);
  await loadLists();
  await renderLibrary();
  await renderContinueWatching();
  setStatus(`Imported ${payload.favorites.length} saved entries.`,"ok");
}
function updateModeFields(){
  const tv=modeSelect.value==="tv";
  seasonInput.classList.toggle("hidden",!tv);
  episodeInput.classList.toggle("hidden",!tv);
  renderCurrent(currentEntrySafe());
}
function showPanel(panel){
  state.activePanel=panel;
  document.querySelectorAll("[data-panel]").forEach(item=>item.classList.toggle("active",item.dataset.panel===panel));
  $("#libraryPanel").classList.toggle("hidden",panel!=="library");
  $("#continuePanel").classList.toggle("hidden",panel!=="continue");
  $("#relatedPanel").classList.toggle("hidden",panel!=="related");
}

document.querySelectorAll("[data-panel]").forEach(button=>button.addEventListener("click",()=>showPanel(button.dataset.panel)));
$("#playButton").addEventListener("click",()=>play());
$("#previousButton").addEventListener("click",()=>step(-1));
$("#nextButton").addEventListener("click",()=>step(1));
$("#favoriteButton").addEventListener("click",openSaveDialog);
$("#resolveButton").addEventListener("click",async()=>{try{await resolveMetadata(currentEntry())}catch(error){setStatus(error.message,"error")}});
$("#resolveListButton").addEventListener("click",()=>resolveSelectedList());
$("#markListWatchedButton").addEventListener("click",()=>markSelectedListWatched());
$("#fullscreenButton").addEventListener("click",async()=>{
  try{if(document.fullscreenElement)await document.exitFullscreen();else await $("#playerWrap").requestFullscreen()}
  catch(error){setStatus(`Fullscreen failed: ${error.message}`,"error")}
});
modeSelect.addEventListener("change",updateModeFields);
mediaIdInput.addEventListener("keydown",event=>{if(event.key==="Enter")play()});
$("#addListButton").addEventListener("click",()=>addList().catch(error=>setStatus(error.message,"error")));
$("#newListName").addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();addList().catch(error=>setStatus(error.message,"error"))}});
$("#listChips").addEventListener("click",event=>{
  const button=event.target.closest("[data-list]");
  if(!button)return;
  state.selectedList=button.dataset.list;
  renderListControls().catch(error=>setStatus(error.message,"error"));
  renderLibrary().catch(error=>setStatus(error.message,"error"));
});
$("#librarySearch").addEventListener("input",()=>renderLibrary().catch(error=>setStatus(error.message,"error")));
$("#libraryCards").addEventListener("click",async event=>{
  const playButton=event.target.closest("[data-play-key]");
  const resolveButton=event.target.closest("[data-resolve-key]");
  const watchButton=event.target.closest("[data-watch-key]");
  const removeButton=event.target.closest("[data-remove-key]");
  try{
    if(playButton){const entry=await getValue(FAVORITES_STORE,playButton.dataset.playKey);if(entry)play(entry)}
    else if(resolveButton)await resolveOneFavorite(resolveButton.dataset.resolveKey);
    else if(watchButton)await toggleWatched(watchButton.dataset.watchKey);
    else if(removeButton){
      await deleteValue(FAVORITES_STORE,removeButton.dataset.removeKey);
      await renderListControls();
      await renderLibrary();
      setStatus("Removed from library.");
    }
  }catch(error){setStatus(error.message,"error")}
});
$("#continueCards").addEventListener("click",async event=>{
  const playButton=event.target.closest("[data-continue-play]");
  const doneButton=event.target.closest("[data-continue-done]");
  const removeButton=event.target.closest("[data-continue-remove]");
  try{
    if(playButton){const entry=await getValue(HISTORY_STORE,playButton.dataset.continuePlay);if(entry)play(entry)}
    else if(doneButton)await completeHistory(doneButton.dataset.continueDone);
    else if(removeButton){await deleteValue(HISTORY_STORE,removeButton.dataset.continueRemove);await renderContinueWatching()}
  }catch(error){setStatus(error.message,"error")}
});
$("#relatedCards").addEventListener("click",async event=>{
  const button=event.target.closest("[data-copy-id]");
  if(!button)return;
  mediaIdInput.value=button.dataset.copyId;
  try{await navigator.clipboard.writeText(button.dataset.copyId);setStatus(`ID copied and loaded: ${button.dataset.copyId}`,"ok")}
  catch{setStatus(`ID field set to ${button.dataset.copyId}.`,"ok")}
});
$("#saveForm").addEventListener("submit",saveCurrentFavorite);
$("#cancelSave").addEventListener("click",()=>$("#saveDialog").close());
$("#exportButton").addEventListener("click",()=>exportLibrary().catch(error=>setStatus(error.message,"error")));
$("#importButton").addEventListener("click",()=>$("#importFile").click());
$("#importFile").addEventListener("change",async event=>{
  const file=event.target.files?.[0];
  if(!file)return;
  try{await importLibrary(file)}catch(error){setStatus(error.message,"error")}finally{event.target.value=""}
});
$("#storageButton").addEventListener("click",()=>$("#storageDialog").showModal());
$("#closeStorage").addEventListener("click",()=>$("#storageDialog").close());

async function initialize(){
  baseUrlInput.value=localStorage.getItem(`${SETTINGS_PREFIX}baseUrl`)||"https://vidcore.net";
  modeSelect.value=localStorage.getItem(`${SETTINGS_PREFIX}mode`)||"movie";
  mediaIdInput.value=localStorage.getItem(`${SETTINGS_PREFIX}mediaId`)||"1";
  seasonInput.value=localStorage.getItem(`${SETTINGS_PREFIX}season`)||"1";
  episodeInput.value=localStorage.getItem(`${SETTINGS_PREFIX}episode`)||"1";
  updateModeFields();
  try{
    await openDatabase();
    await loadLists();
    await renderLibrary();
    await renderContinueWatching();
    setStatus("Library ready. Resolve list updates every unresolved title at once.","ok");
  }catch(error){setStatus(`Storage failed: ${error.message}`,"error")}
}
initialize();