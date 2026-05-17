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
  shuffle: false,
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

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen();
    return;
  }
  document.documentElement.requestFullscreen({ navigationUI: "hide" });
}

function render() {
  if (!state.filtered.length) {
    el.title.textContent = "Нет роликов под фильтр";
    el.meta.textContent = "Смените год или категорию";
    el.channel.textContent = "---";
    el.player.removeAttribute("src");
    return;
  }

  const item = state.filtered[state.index];
  el.title.textContent = state.isOn ? item.title : "Нажмите POWER";
  el.meta.textContent = state.isOn
    ? `${item.year} · ${item.channel || "канал неизвестен"} · ${
        categoryLabels[item.category] || item.category
      }`
    : "Российское ретро-ТВ";
  el.channel.textContent = state.isOn ? String(item.channel || "TV") : "---";
  el.source.href = item.sourceUrl || `https://www.youtube.com/watch?v=${item.youtubeVideoId}`;

  if (state.isOn) {
    el.player.src = `https://www.youtube.com/embed/${item.youtubeVideoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
  } else {
    el.player.removeAttribute("src");
  }
}

init().catch((error) => {
  el.title.textContent = "Ошибка загрузки";
  el.meta.textContent = error.message;
});
