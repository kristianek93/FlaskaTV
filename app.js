const state = {
  screen: "menu",
  playerCount: 4,
  players: [],
  history: [],
  settings: {
    difficulty: 1,
    lives: 3,
    bottleType: 0
  },
  spinning: false,
  lastSelected: null
};

const difficulties = ["Easy", "Normal", "Hard", "Insane"];
const bottleTypes = ["coca cola", "sprite", "božkov", "finlandia", "jiná"];

const screens = {
  menu: document.getElementById("screen-menu"),
  setup: document.getElementById("screen-setup"),
  players: document.getElementById("screen-players"),
  game: document.getElementById("screen-game"),
  settings: document.getElementById("screen-settings"),
  end: document.getElementById("screen-end")
};

const statusEl = document.getElementById("status");
const playerCountEl = document.getElementById("player-count");
const playersForm = document.getElementById("players-form");
const playersRing = document.getElementById("players-ring");
const bottle = document.getElementById("bottle");
const hudDifficulty = document.getElementById("hud-difficulty");
const hudLives = document.getElementById("hud-lives");
const hudLast = document.getElementById("hud-last");
const difficultyEl = document.getElementById("difficulty");
const livesEl = document.getElementById("lives");
const bottleTypeEl = document.getElementById("bottle-type");
const taskModal = document.getElementById("task-modal");
const taskTitle = document.getElementById("task-title");
const taskText = document.getElementById("task-text");
const winnerText = document.getElementById("winner-text");

let namesDb = [];
let tasksDb = [];
let focusables = [];
let focusIndex = 0;

function setScreen(name) {
  state.screen = name;
  Object.keys(screens).forEach((key) => {
    screens[key].classList.toggle("active", key === name);
  });
  statusEl.textContent = name.toUpperCase();
  refreshFocus();
}

function refreshFocus() {
  const active = document.querySelector(".screen.active");
  focusables = Array.from(active.querySelectorAll(".focusable"));
  focusIndex = 0;
  applyFocus();
}

function applyFocus() {
  focusables.forEach((el, idx) => {
    el.classList.toggle("focused", idx === focusIndex);
  });
}

function moveFocus(delta) {
  if (!focusables.length) return;
  focusIndex = (focusIndex + delta + focusables.length) % focusables.length;
  applyFocus();
}

function activateFocused() {
  const el = focusables[focusIndex];
  if (el) el.click();
}

function renderSettings() {
  difficultyEl.textContent = difficulties[state.settings.difficulty];
  livesEl.textContent = state.settings.lives;
  bottleTypeEl.textContent = bottleTypes[state.settings.bottleType];
}

function updateHud() {
  hudDifficulty.textContent = difficulties[state.settings.difficulty];
  hudLives.textContent = state.settings.lives;
  hudLast.textContent = state.lastSelected ? state.lastSelected.name : "-";
}

function buildPlayersForm() {
  playersForm.innerHTML = "";
  state.players = [];
  for (let i = 0; i < state.playerCount; i++) {
    const wrapper = document.createElement("div");
    wrapper.className = "player-input";

    const input = document.createElement("input");
    input.placeholder = `Hráč ${i + 1}`;
    input.dataset.index = i;
    input.classList.add("focusable");
    wrapper.appendChild(input);

    const suggestions = document.createElement("div");
    suggestions.className = "suggestions";
    suggestions.hidden = true;
    wrapper.appendChild(suggestions);

    input.addEventListener("input", () => onNameInput(input, suggestions));
    input.addEventListener("focus", () => onNameInput(input, suggestions));

    playersForm.appendChild(wrapper);
  }
}

function onNameInput(input, suggestions) {
  const value = input.value.trim().toLowerCase();
  suggestions.innerHTML = "";
  if (!value) {
    suggestions.hidden = true;
    return;
  }
  const matches = namesDb
    .filter((n) => n.name.toLowerCase().startsWith(value))
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 6);

  matches.forEach((item, idx) => {
    const row = document.createElement("div");
    row.className = "suggestion" + (idx === 0 ? " active" : "");
    row.textContent = item.name;
    row.addEventListener("click", () => {
      input.value = item.name;
      suggestions.hidden = true;
    });
    suggestions.appendChild(row);
  });

  suggestions.hidden = matches.length === 0;
}

function collectPlayers() {
  const inputs = playersForm.querySelectorAll("input");
  state.players = Array.from(inputs).map((input) => {
    const name = input.value.trim();
    return {
      name: name || "Hráč",
      lives: state.settings.lives,
      eliminated: false,
      color: pickColor(name)
    };
  });
}

function pickColor(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 60%)`;
}

function renderPlayersRing(selectedIndex) {
  playersRing.innerHTML = "";
  const total = state.players.length;
  const centerX = playersRing.clientWidth / 2;
  const centerY = playersRing.clientHeight / 2;
  const radius = Math.min(centerX, centerY) - 60;

  state.players.forEach((player, index) => {
    const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
    const x = centerX + radius * Math.cos(angle) - 35;
    const y = centerY + radius * Math.sin(angle) - 35;

    const el = document.createElement("div");
    el.className = "avatar";
    if (player.eliminated) el.classList.add("eliminated");
    if (selectedIndex === index) el.classList.add("selected");
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.background = player.color;
    el.textContent = initials(player.name);
    playersRing.appendChild(el);
  });
}

function initials(name) {
  const parts = name.split(" ").filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

function spinBottle() {
  if (state.spinning) return;
  const alive = state.players.filter((p) => !p.eliminated);
  if (alive.length <= 1) return endGame();

  state.spinning = true;
  const targetIndex = Math.floor(Math.random() * state.players.length);
  const turns = 3 + Math.random() * 2;
  const stopAngle = 360 * turns + (360 / state.players.length) * targetIndex;

  animateRotation(stopAngle, 2200, () => {
    state.spinning = false;
    state.lastSelected = state.players[targetIndex];
    renderPlayersRing(targetIndex);
    updateHud();
    showTask(state.players[targetIndex]);
  });
}

function animateRotation(targetDeg, duration, done) {
  const start = performance.now();
  const initial = 0;

  function step(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    const deg = initial + targetDeg * eased;
    bottle.style.transform = `translate(-50%, -50%) rotate(${deg}deg)`;
    if (t < 1) requestAnimationFrame(step);
    else done();
  }
  requestAnimationFrame(step);
}

async function showTask(player) {
  taskTitle.textContent = `Úkol pro ${player.name}`;
  taskText.textContent = "Načítám úkol...";
  taskModal.classList.remove("hidden");
  refreshFocus();
  taskText.textContent = await getTask(player.name);
}

async function getTask(playerName) {
  const cfg = window.APP_CONFIG || {};
  if (!cfg.apiKey || !cfg.endpoint) {
    return tasksDb[Math.floor(Math.random() * tasksDb.length)] || "Vymysli krátký úkol.";
  }

  const prompt = `Vymysli krátký, bezpečný a zábavný úkol pro hráče ${playerName}. Obtížnost: ${difficulties[state.settings.difficulty]}.`;
  try {
    const res = await fetch(cfg.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${cfg.apiKey}`
      },
      body: JSON.stringify({
        model: cfg.model || "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }]
      })
    });
    const json = await res.json();
    return json.choices?.[0]?.message?.content?.trim() || "Zkus něco zábavného.";
  } catch (err) {
    return tasksDb[Math.floor(Math.random() * tasksDb.length)] || "Zkus něco zábavného.";
  }
}

function onTaskResult(success) {
  if (!success && state.lastSelected) {
    state.lastSelected.lives -= 1;
    if (state.lastSelected.lives <= 0) state.lastSelected.eliminated = true;
  }
  state.history.push({
    name: state.lastSelected?.name || "?",
    task: taskText.textContent,
    success
  });
  taskModal.classList.add("hidden");
  renderPlayersRing();
  updateHud();
  checkEnd();
  setScreen("game");
}

function checkEnd() {
  const alive = state.players.filter((p) => !p.eliminated);
  if (alive.length <= 1) endGame();
}

function endGame() {
  const winner = state.players.find((p) => !p.eliminated);
  winnerText.textContent = winner ? `Vítěz je ${winner.name}!` : "Nikdo nepřežil";
  setScreen("end");
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;

  switch (action) {
    case "start":
      setScreen("setup");
      break;
    case "settings":
      setScreen("settings");
      break;
    case "history":
      alert("Historie zatím není v UI.");
      break;
    case "players-dec":
      state.playerCount = Math.max(2, state.playerCount - 1);
      playerCountEl.textContent = state.playerCount;
      break;
    case "players-inc":
      state.playerCount = Math.min(12, state.playerCount + 1);
      playerCountEl.textContent = state.playerCount;
      break;
    case "confirm-players":
      buildPlayersForm();
      setScreen("players");
      break;
    case "players-done":
      collectPlayers();
      setScreen("game");
      renderPlayersRing();
      updateHud();
      break;
    case "spin":
      spinBottle();
      break;
    case "settings-back":
      setScreen("menu");
      break;
    case "diff-dec":
      state.settings.difficulty = Math.max(0, state.settings.difficulty - 1);
      renderSettings();
      updateHud();
      break;
    case "diff-inc":
      state.settings.difficulty = Math.min(difficulties.length - 1, state.settings.difficulty + 1);
      renderSettings();
      updateHud();
      break;
    case "lives-dec":
      state.settings.lives = Math.max(1, state.settings.lives - 1);
      renderSettings();
      updateHud();
      break;
    case "lives-inc":
      state.settings.lives = Math.min(5, state.settings.lives + 1);
      renderSettings();
      updateHud();
      break;
    case "bottle-dec":
      state.settings.bottleType = Math.max(0, state.settings.bottleType - 1);
      renderSettings();
      break;
    case "bottle-inc":
      state.settings.bottleType = Math.min(bottleTypes.length - 1, state.settings.bottleType + 1);
      renderSettings();
      break;
    case "task-done":
      onTaskResult(true);
      break;
    case "task-fail":
      onTaskResult(false);
      break;
    case "restart":
      setScreen("setup");
      break;
    case "back-menu":
      setScreen("menu");
      break;
    default:
      break;
  }
});

document.addEventListener("keydown", (e) => {
  const code = e.key;
  if (code === "ArrowLeft" || code === "ArrowUp") moveFocus(-1);
  if (code === "ArrowRight" || code === "ArrowDown") moveFocus(1);
  if (code === "Enter") activateFocused();
  if (code === "Escape" || e.keyCode === 10009) setScreen("menu");
});

async function loadData() {
  const names = await fetch("data/names.json").then((r) => r.json()).catch(() => []);
  const tasks = await fetch("data/tasks.json").then((r) => r.json()).catch(() => []);
  namesDb = names;
  tasksDb = tasks;
}

loadData().then(() => {
  playerCountEl.textContent = state.playerCount;
  renderSettings();
  updateHud();
  setScreen("menu");
});
