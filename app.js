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
  years: document.querySelector("#yearStrip"),
  filters: document.querySelector("#filters"),
};

async function init() {
  const response = await fetch("./data/seed-catalog.json");
  state.catalog = await response.json();
  state.filtered = state.catalog;
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
  el.player.contentWindow.postMessage(JSON.stringify(message), "https://www.youtube.com");
}

function handlePlayerMessage(event) {
  if (!event.origin.includes("youtube.com") || !state.isOn) return;

  const data = typeof event.data === "string" ? safeParse(event.data) : event.data;
  if (!data) return;

  if (data.event === "onError") {
    showTuning("Видео недоступно, переключаю...");
    window.setTimeout(() => advanceAfterEnd(), 1200);
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

function advanceAfterEnd() {
  if (!state.filtered.length || state.isAdvancing) return;
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
    state.index = getRandomIndex(state.lastPowerVideoId);
    state.lastPowerVideoId = state.filtered[state.index]?.youtubeVideoId || null;
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
  if (!state.filtered.length) return;
  if (state.shuffle) {
    state.index = Math.floor(Math.random() * state.filtered.length);
  } else {
    state.index = (state.index + direction + state.filtered.length) % state.filtered.length;
  }
  render();
}

function getRandomIndex(excludedVideoId = null) {
  if (state.filtered.length <= 1) return 0;

  let nextIndex = Math.floor(Math.random() * state.filtered.length);
  while (state.filtered[nextIndex]?.youtubeVideoId === excludedVideoId) {
    nextIndex = Math.floor(Math.random() * state.filtered.length);
  }
  return nextIndex;
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
    el.title.textContent = "Нет роликов под фильтр";
    el.meta.textContent = "Смените год или категорию";
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
    showTuning("Настройка канала...");
    el.player.src = buildEmbedUrl(item.youtubeVideoId);
    window.setTimeout(() => {
      if (state.isOn && token === state.loadToken && !el.tube.classList.contains("is-loaded")) {
        el.status.textContent = "Если видео не появилось, откройте SRC";
      }
    }, 5000);
  } else {
    state.loadToken += 1;
    el.tube.classList.remove("is-loaded", "is-tuning");
    el.status.textContent = "Настройка канала...";
    el.player.removeAttribute("src");
  }
}

function buildEmbedUrl(videoId) {
  const params = new URLSearchParams({
    autoplay: "1",
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
    enablejsapi: "1",
  });

  if (window.location.origin !== "null") {
    params.set("origin", window.location.origin);
  }

  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

init().catch((error) => {
  el.title.textContent = "Ошибка загрузки";
  el.meta.textContent = error.message;
});
