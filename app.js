const categoryLabels = {
  news: "Новости",
  documentary: "Док",
  music: "Музыка",
  ads: "Реклама",
  kids: "Детское",
  cartoons: "Мульт",
  series: "Сериалы",
  comedy: "Юмор",
  talk: "Ток-шоу",
  gameshow: "Игры",
  sports: "Спорт",
  idents: "Заставки",
  movies: "Кино",
  regional: "Регион",
  other: "Другое",
};

const state = {
  catalog: [],
  filtered: [],
  index: 0,
  selectedYear: "all",
  selectedCategory: "all",
  isOn: false,
  loadToken: 0,
  shuffle: false,
  isAdvancing: false,
  lastPowerVideoId: null,
  controlsTimer: null,
  playerControlsVisible: false,
  playbackSeconds: 0,
  blockedVideoIds: new Set(),
  noiseFrames: [],
  noiseFrameIndex: 0,
  noiseTimer: null,
};

const el = {
  tube: document.querySelector(".tube"),
  player: document.querySelector("#player"),
  power: document.querySelector("#powerButton"),
  prev: document.querySelector("#prevButton"),
  next: document.querySelector("#nextButton"),
  shuffle: document.querySelector("#shuffleButton"),
  full: document.querySelector("#fullButton"),
  title: document.querySelector("#title"),
  meta: document.querySelector("#meta"),
  channel: document.querySelector("#channelLabel"),
  source: document.querySelector("#sourceLink"),
  poster: document.querySelector("#videoPoster"),
  status: document.querySelector("#videoStatus"),
  staticLayer: document.querySelector("#staticLayer"),
  years: document.querySelector("#yearStrip"),
  filters: document.querySelector("#filters"),
};

async function init() {
  const response = await fetch("./data/seed-catalog.json");
  state.catalog = await response.json();
  state.filtered = state.catalog;
  prepareNoiseFrames();
  renderYears();
  renderFilters();
  bindControls();
  render();
}

function bindControls() {
  el.player.addEventListener("load", () => {
    if (!state.isOn) return;
    registerPlayerEvents();
    window.setTimeout(() => {
      if (state.isOn) el.tube.classList.add("is-loaded");
    }, 700);
  });
  el.power.addEventListener("click", togglePower);
  el.prev.addEventListener("click", () => changeChannel(-1));
  el.next.addEventListener("click", () => changeChannel(1));
  el.shuffle.addEventListener("click", toggleShuffle);
  el.full.addEventListener("click", toggleFullscreen);
  el.tube.addEventListener("pointerdown", revealPlayerControls);

  window.addEventListener("keydown", (event) => {
    if (event.key === " ") {
      event.preventDefault();
      togglePower();
    }
    if (event.key === "ArrowRight") changeChannel(1);
    if (event.key === "ArrowLeft") changeChannel(-1);
    if (event.key.toLowerCase() === "s") toggleShuffle();
    if (event.key.toLowerCase() === "f") toggleFullscreen();
  });

  window.addEventListener("message", handlePlayerMessage);
}

function registerPlayerEvents() {
  postToPlayer({ event: "listening", id: "player" });
  postToPlayer({ event: "command", func: "addEventListener", args: ["onStateChange"] });
  postToPlayer({ event: "command", func: "addEventListener", args: ["onError"] });
}

function postToPlayer(message) {
  if (!el.player.contentWindow) return;
  el.player.contentWindow.postMessage(JSON.stringify(message), getPlayerOrigin());
}

function handlePlayerMessage(event) {
  if (!isYouTubeOrigin(event.origin) || !state.isOn) return;

  const data = typeof event.data === "string" ? safeParse(event.data) : event.data;
  if (!data) return;
  if (data.event === "infoDelivery" && typeof data.info?.currentTime === "number") {
    state.playbackSeconds = data.info.currentTime;
  }

  if (data.event === "onError") {
    markCurrentVideoBlocked(data.info);
    showTuning("Видео недоступно, переключаю...");
    window.setTimeout(() => advanceAfterEnd(), 450);
    return;
  }

  const playerState = data.event === "infoDelivery" ? data.info?.playerState : data.info;
  if (data.event !== "onStateChange" && data.event !== "infoDelivery") return;

  if (playerState === 0) {
    advanceAfterEnd();
    return;
  }

  if (playerState === 1) {
    el.tube.classList.add("is-loaded");
    el.tube.classList.remove("is-tuning");
    stopNoiseAnimation();
    el.status.textContent = "";
    return;
  }

  if (playerState === 3) {
    showTuning("Настройка канала...");
  }
}

function safeParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function isYouTubeOrigin(origin) {
  return origin.includes("youtube.com") || origin.includes("youtube-nocookie.com");
}

function getPlayerOrigin() {
  try {
    const src = el.player.getAttribute("src");
    if (src) return new URL(src).origin;
  } catch {
    // Keep fallback for malformed or missing src values.
  }
  return "https://www.youtube.com";
}

function advanceAfterEnd() {
  if (!getPlayableCount() || state.isAdvancing) return;
  state.isAdvancing = true;
  showTuning("Следующий канал...");
  window.setTimeout(() => {
    changeChannel(1);
    state.isAdvancing = false;
  }, 650);
}

function showTuning(message) {
  el.status.textContent = message;
  el.tube.classList.remove("is-loaded");
  el.tube.classList.add("is-tuning");
  startNoiseAnimation();
}

function prepareNoiseFrames() {
  const frameCount = 9;
  for (let i = 0; i < frameCount; i += 1) {
    state.noiseFrames.push(generateNoiseFrame(220, 165));
  }
  applyNoiseFrame(0);
}

function generateNoiseFrame(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const image = ctx.createImageData(width, height);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const value = Math.floor(Math.random() * 256);
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
    data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return canvas.toDataURL("image/png");
}

function applyNoiseFrame(index) {
  if (!el.staticLayer || !state.noiseFrames.length) return;
  const frame = state.noiseFrames[index % state.noiseFrames.length];
  el.staticLayer.style.backgroundImage = `url("${frame}")`;
}

function startNoiseAnimation() {
  if (state.noiseTimer || !state.noiseFrames.length) return;
  applyNoiseFrame(state.noiseFrameIndex);
  state.noiseTimer = window.setInterval(() => {
    state.noiseFrameIndex = (state.noiseFrameIndex + 1) % state.noiseFrames.length;
    applyNoiseFrame(state.noiseFrameIndex);
  }, 58);
}

function stopNoiseAnimation() {
  if (state.noiseTimer) {
    window.clearInterval(state.noiseTimer);
    state.noiseTimer = null;
  }
}

function revealPlayerControls() {
  if (!state.isOn) return;

  if (!state.playerControlsVisible) {
    setPlayerControlsVisibility(true);
  }
  window.clearTimeout(state.controlsTimer);
  state.controlsTimer = window.setTimeout(() => {
    setPlayerControlsVisibility(false);
  }, 4500);
}

function setPlayerControlsVisibility(visible) {
  if (!getPlayableCount()) return;
  if (visible === state.playerControlsVisible) return;

  state.playerControlsVisible = visible;
  el.tube.classList.toggle("is-player-interactive", visible);

  const current = state.filtered[state.index];
  if (!current) return;

  const startSeconds = Number.isFinite(state.playbackSeconds)
    ? Math.max(0, Math.floor(state.playbackSeconds))
    : 0;
  state.loadToken += 1;
  el.player.src = buildEmbedUrl(current.youtubeVideoId, {
    controls: visible ? 1 : 0,
    startSeconds,
  });
}

function renderYears() {
  const years = ["all", ...new Set(state.catalog.map((item) => item.year))].sort((a, b) => {
    if (a === "all") return -1;
    if (b === "all") return 1;
    return a - b;
  });

  el.years.replaceChildren(
    ...years.map((year) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = year === "all" ? "Все" : year;
      button.className = year === state.selectedYear ? "is-active" : "";
      button.addEventListener("click", () => {
        state.selectedYear = year;
        applyFilters();
      });
      return button;
    }),
  );
}

function renderFilters() {
  const categories = ["all", ...new Set(state.catalog.map((item) => item.category))];

  el.filters.replaceChildren(
    ...categories.map((category) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = category === "all" ? "Все" : categoryLabels[category] || category;
      button.className = category === state.selectedCategory ? "is-active" : "";
      button.addEventListener("click", () => {
        state.selectedCategory = category;
        applyFilters();
      });
      return button;
    }),
  );
}

function applyFilters() {
  state.filtered = state.catalog.filter((item) => {
    const yearMatch = state.selectedYear === "all" || item.year === state.selectedYear;
    const categoryMatch =
      state.selectedCategory === "all" || item.category === state.selectedCategory;
    return yearMatch && categoryMatch;
  });

  state.index = 0;
  renderYears();
  renderFilters();
  render();
}

function togglePower() {
  state.isOn = !state.isOn;
  if (state.isOn) {
    state.index = getRandomIndex(state.lastPowerVideoId, state.index);
    state.lastPowerVideoId = state.filtered[state.index]?.youtubeVideoId || null;
    state.playerControlsVisible = false;
    state.playbackSeconds = 0;
  }
  el.power.setAttribute("aria-pressed", String(state.isOn));
  el.tube.classList.toggle("is-on", state.isOn);
  render();
}

function toggleShuffle() {
  state.shuffle = !state.shuffle;
  el.shuffle.setAttribute("aria-pressed", String(state.shuffle));
}

function changeChannel(direction) {
  if (!getPlayableCount()) return;
  if (state.shuffle) {
    state.index = getRandomIndex(null, state.index);
  } else {
    const nextIndex = findNextPlayableIndex(state.index, direction);
    if (nextIndex === -1) return;
    state.index = nextIndex;
  }
  render();
}

function getRandomIndex(excludedVideoId = null, fallbackIndex = 0) {
  const playable = state.filtered
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !state.blockedVideoIds.has(item.youtubeVideoId))
    .map(({ index }) => index);
  if (!playable.length) return fallbackIndex;
  if (playable.length === 1) return playable[0];

  let nextIndex = playable[Math.floor(Math.random() * playable.length)];
  while (state.filtered[nextIndex]?.youtubeVideoId === excludedVideoId && playable.length > 1) {
    nextIndex = playable[Math.floor(Math.random() * playable.length)];
  }
  return nextIndex;
}

function findNextPlayableIndex(fromIndex, direction) {
  for (let step = 1; step <= state.filtered.length; step += 1) {
    const idx = (fromIndex + step * direction + state.filtered.length) % state.filtered.length;
    const item = state.filtered[idx];
    if (item && !state.blockedVideoIds.has(item.youtubeVideoId)) return idx;
  }
  return -1;
}

function getPlayableCount() {
  return state.filtered.filter((item) => !state.blockedVideoIds.has(item.youtubeVideoId)).length;
}

function markCurrentVideoBlocked(errorCode) {
  const current = state.filtered[state.index];
  if (!current) return;
  state.blockedVideoIds.add(current.youtubeVideoId);
  if (typeof errorCode === "number") {
    console.info("Skipping blocked video", current.youtubeVideoId, "error", errorCode);
  }
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen();
    return;
  }
  document.documentElement.requestFullscreen({ navigationUI: "hide" });
}

function render() {
  el.tube.classList.toggle("is-on", state.isOn);
  if (!state.filtered.length) {
    stopNoiseAnimation();
    el.title.textContent = "Нет роликов под фильтр";
    el.meta.textContent = "Смените год или категорию";
    el.channel.textContent = "---";
    el.player.removeAttribute("src");
    el.tube.classList.remove("is-loaded", "is-tuning");
    return;
  }

  if (!getPlayableCount()) {
    stopNoiseAnimation();
    el.title.textContent = "Нет доступных видео";
    el.meta.textContent = "Смените фильтр или обновите каталог";
    el.channel.textContent = "---";
    el.player.removeAttribute("src");
    el.tube.classList.remove("is-loaded", "is-tuning");
    return;
  }

  const item = state.filtered[state.index];
  const youtubeUrl = `https://www.youtube.com/watch?v=${item.youtubeVideoId}`;
  el.title.textContent = state.isOn ? item.title : "Нажмите POWER";
  el.meta.textContent = state.isOn
    ? `${item.year} · ${item.channel || "канал неизвестен"} · ${
        categoryLabels[item.category] || item.category
      }`
    : "Российское ретро-ТВ";
  el.channel.textContent = state.isOn ? String(item.channel || "TV") : "---";
  el.source.href = youtubeUrl;
  el.source.title = item.sourceUrl ? `Источник: ${item.sourceUrl}` : "Открыть на YouTube";
  el.poster.style.setProperty(
    "--poster",
    `url("https://i.ytimg.com/vi/${item.youtubeVideoId}/hqdefault.jpg")`,
  );

  if (state.isOn) {
    state.loadToken += 1;
    const token = state.loadToken;
    state.playerControlsVisible = false;
    state.playbackSeconds = 0;
    window.clearTimeout(state.controlsTimer);
    el.tube.classList.remove("is-player-interactive");
    showTuning("Настройка канала...");
    el.player.src = buildEmbedUrl(item.youtubeVideoId, { controls: 0, startSeconds: 0 });
    window.setTimeout(() => {
      if (state.isOn && token === state.loadToken && !el.tube.classList.contains("is-loaded")) {
        el.status.textContent = "Если видео не появилось, откройте SRC";
      }
    }, 5000);
  } else {
    state.loadToken += 1;
    window.clearTimeout(state.controlsTimer);
    state.playerControlsVisible = false;
    state.playbackSeconds = 0;
    el.tube.classList.remove("is-loaded", "is-tuning", "is-player-interactive");
    stopNoiseAnimation();
    el.status.textContent = "Настройка канала...";
    el.player.removeAttribute("src");
  }
}

function buildEmbedUrl(videoId, options = {}) {
  const controls = options.controls ?? 0;
  const startSeconds = Math.max(0, Math.floor(options.startSeconds ?? 0));
  const embedHost = controls ? "www.youtube.com" : "www.youtube-nocookie.com";
  const params = new URLSearchParams({
    autoplay: "1",
    controls: String(controls),
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
    enablejsapi: "1",
  });
  if (startSeconds > 0) params.set("start", String(startSeconds));

  if (window.location.origin !== "null") {
    params.set("origin", window.location.origin);
  }

  return `https://${embedHost}/embed/${videoId}?${params.toString()}`;
}

init().catch((error) => {
  el.title.textContent = "Ошибка загрузки";
  el.meta.textContent = error.message;
});
