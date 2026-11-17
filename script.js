const storage = {
  get(key, fallback) {
    try {
      const rawValue = localStorage.getItem(key);
      return rawValue === null ? fallback : JSON.parse(rawValue);
    } catch (error) {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      // Ignore storage write issues in restricted browser contexts.
    }
  }
};

const timeText = document.getElementById("time");
const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");
const skipBtn = document.getElementById("skipBtn");
const modeLabel = document.getElementById("modeLabel");
const hint = document.getElementById("hint");
const progressCircle = document.getElementById("progressCircle");
const statusText = document.getElementById("statusText");
const sessionCount = document.getElementById("sessionCount");
const timerCard = document.querySelector(".timer-card");
const modeButtons = document.querySelectorAll(".mode-btn");
const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const taskList = document.getElementById("taskList");
const focusMinutesInput = document.getElementById("focusMinutes");
const shortBreakMinutesInput = document.getElementById("shortBreakMinutes");
const longBreakMinutesInput = document.getElementById("longBreakMinutes");
const autoStartToggle = document.getElementById("autoStartToggle");
const challengeSelect = document.getElementById("challengeSelect");
const backgroundSelect = document.getElementById("backgroundSelect");
const musicStyleSelect = document.getElementById("musicStyleSelect");
const musicPlatformSelect = document.getElementById("musicPlatformSelect");
const musicLink = document.getElementById("musicLink");
const goalProgressFill = document.getElementById("goalProgressFill");
const goalProgressText = document.getElementById("goalProgressText");
const challengeReward = document.getElementById("challengeReward");
const themeToggle = document.getElementById("themeToggle");

const defaultSettings = {
  focus: 25,
  shortBreak: 5,
  longBreak: 15,
  dailyGoal: 4,
  autoStart: true
};

const settings = {
  focus: storage.get("pomodoroFocusMinutes", defaultSettings.focus),
  shortBreak: storage.get("pomodoroShortBreakMinutes", defaultSettings.shortBreak),
  longBreak: storage.get("pomodoroLongBreakMinutes", defaultSettings.longBreak),
  dailyGoal: storage.get("pomodoroDailyGoal", defaultSettings.dailyGoal),
  autoStart: storage.get("pomodoroAutoStart", defaultSettings.autoStart)
};

const modes = {
  focus: {
    minutes: settings.focus,
    seconds: settings.focus * 60,
    label: "Focus time",
    hint: "One thing at a time.",
    color: "#dd6b55"
  },
  shortBreak: {
    minutes: settings.shortBreak,
    seconds: settings.shortBreak * 60,
    label: "Short break",
    hint: "Take a small breath.",
    color: "#6a9b88"
  },
  longBreak: {
    minutes: settings.longBreak,
    seconds: settings.longBreak * 60,
    label: "Long break",
    hint: "You earned the pause.",
    color: "#7191ac"
  }
};

const modeOrder = ["focus", "shortBreak", "longBreak"];
const circumference = 2 * Math.PI * 116;
const challenges = {
  2: { name: "Warm-up", reward: "Focus Starter badge" },
  4: { name: "Consistency", reward: "Focus Flow badge" },
  6: { name: "Deep work", reward: "Focus Champion badge" },
  8: { name: "Power day", reward: "Focus Legend badge" }
};
const backgroundOptions = new Set(["default", "sunset", "ocean", "lavender", "meadow"]);
const musicStyles = {
  lofi: { label: "Lo-fi beats", query: "lofi instrumental focus music" },
  ambient: { label: "Ambient", query: "ambient focus music no vocals" },
  classical: { label: "Classical", query: "classical music for studying" },
  nature: { label: "Nature sounds", query: "rain and nature sounds for focus" }
};
const musicPlatforms = {
  youtube: { label: "YouTube", searchUrl: "https://www.youtube.com/results?search_query=" },
  youtubeMusic: { label: "YouTube Music", searchUrl: "https://music.youtube.com/search?q=" },
  spotify: { label: "Spotify", searchUrl: "https://open.spotify.com/search/" },
  soundcloud: { label: "SoundCloud", searchUrl: "https://soundcloud.com/search/sounds?q=" }
};
let sessionDate = getLocalDateKey();

let currentMode = "focus";
let totalSeconds = modes.focus.seconds;
let remainingSeconds = totalSeconds;
let timerId = null;
let isRunning = false;
const storedSessionDate = storage.get("pomodoroSessionDate", sessionDate);
let completedSessions = storedSessionDate === sessionDate
  ? Number.parseInt(storage.get("pomodoroSessions", "0"), 10) || 0
  : 0;
let focusSessions = Number.parseInt(storage.get("pomodoroFocusSessions", "0"), 10) || 0;
let statusOverride = null;
let isDarkTheme = storage.get("pomodoroDarkTheme", false) === true;
let currentBackground = storage.get("pomodoroBackground", "default");
let selectedMusicStyle = storage.get("pomodoroMusicStyle", "lofi");
let selectedMusicPlatform = storage.get("pomodoroMusicPlatform", "youtube");
let tasks = storage.get("pomodoroTasks", [
  { id: Date.now(), text: "Review the most important task", done: false }
]);

if (!backgroundOptions.has(currentBackground)) {
  currentBackground = "default";
}

if (!musicStyles[selectedMusicStyle]) {
  selectedMusicStyle = "lofi";
}

if (!musicPlatforms[selectedMusicPlatform]) {
  selectedMusicPlatform = "youtube";
}

if (storedSessionDate !== sessionDate) {
  storage.set("pomodoroSessionDate", sessionDate);
  storage.set("pomodoroSessions", "0");
}

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getModeLabel(mode = currentMode) {
  if (mode === "focus") return "focus";
  if (mode === "shortBreak") return "short break";
  return "long break";
}

function updateStatusText() {
  if (isRunning) {
    statusText.textContent = `${modes[currentMode].label} in progress`;
    return;
  }

  statusText.textContent = statusOverride || "Ready when you are";
}

function showTime() {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  timeText.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  timeText.dateTime = `PT${remainingSeconds}S`;
  progressCircle.style.strokeDasharray = circumference;
  progressCircle.style.strokeDashoffset = circumference * (1 - remainingSeconds / totalSeconds);
}

function updateGoalProgress() {
  const challenge = challenges[settings.dailyGoal] || challenges[defaultSettings.dailyGoal];
  const goal = Number(settings.dailyGoal);
  const progress = Math.min(completedSessions / goal, 1);
  const challengeComplete = completedSessions >= goal;

  goalProgressFill.style.width = `${progress * 100}%`;
  goalProgressText.textContent = `${challenge.name}: ${completedSessions} of ${goal} focus sessions`;
  goalProgressFill.parentElement.setAttribute("aria-valuenow", String(Math.min(completedSessions, goal)));
  goalProgressFill.parentElement.setAttribute("aria-valuemax", String(goal));
  challengeReward.textContent = challengeComplete
    ? `🏆 Challenge complete! Reward unlocked: ${challenge.reward}`
    : `Reward: ${challenge.reward} at ${goal} sessions`;
  challengeReward.classList.toggle("is-earned", challengeComplete);
}

function applyTheme() {
  document.body.classList.toggle("dark-theme", isDarkTheme);
  themeToggle.textContent = isDarkTheme ? "Light theme" : "Dark theme";
  themeToggle.setAttribute("aria-pressed", String(isDarkTheme));
  document.querySelector('meta[name="theme-color"]').content = isDarkTheme ? "#222a27" : "#f5f1ed";
}

function applyBackground() {
  document.body.dataset.background = currentBackground;
  backgroundSelect.value = currentBackground;
}

function updateMusicLink() {
  const platform = musicPlatforms[selectedMusicPlatform];
  const style = musicStyles[selectedMusicStyle];

  musicLink.href = `${platform.searchUrl}${encodeURIComponent(style.query)}`;
  musicLink.textContent = `Listen to ${style.label} on ${platform.label}`;
}

function updateInterface() {
  const mode = modes[currentMode];
  const action = isRunning ? "Pause" : "Start";
  const label = `${action} ${getModeLabel()}`;

  modeLabel.textContent = mode.label;
  hint.textContent = mode.hint;
  progressCircle.style.stroke = mode.color;
  document.documentElement.style.setProperty("--accent", mode.color);

  modeButtons.forEach((button) => {
    const isActive = button.dataset.mode === currentMode;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  sessionCount.textContent = completedSessions;
  updateGoalProgress();
  showTime();
  startBtn.innerHTML = `<span class="play-icon" aria-hidden="true">${isRunning ? "Ⅱ" : "▶"}</span><span>${label}</span>`;
  startBtn.setAttribute("aria-label", label);
  updateStatusText();
}

function setRunning(running, preserveStatus = false) {
  isRunning = running;
  timerCard.classList.toggle("is-running", running);

  if (!running && !preserveStatus) {
    statusOverride = null;
  }

  updateInterface();
}

function stopTimer(options = {}) {
  clearInterval(timerId);
  timerId = null;
  setRunning(false, options.preserveStatus);
}

function setMode(mode, options = {}) {
  stopTimer(options);
  currentMode = mode;
  totalSeconds = modes[mode].seconds;
  remainingSeconds = totalSeconds;
  updateInterface();
}

function playCompletionSound() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    return;
  }

  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = "triangle";
  oscillator.frequency.value = 880;

  gainNode.gain.value = 0.08;
  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.start();
  oscillator.stop(context.currentTime + 0.2);
  oscillator.onended = () => context.close();
}

function showNotification(message) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(message);
  }
}

function saveTaskList() {
  storage.set("pomodoroTasks", tasks);
}

function renderTasks() {
  taskList.innerHTML = "";

  tasks.forEach((task) => {
    const item = document.createElement("li");
    item.className = "task-item";

    const main = document.createElement("label");
    main.className = "task-main";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.done;
    checkbox.addEventListener("change", () => {
      task.done = checkbox.checked;
      saveTaskList();
      renderTasks();
    });

    const text = document.createElement("span");
    text.textContent = task.text;
    text.className = `task-text${task.done ? " done" : ""}`;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-task";
    deleteButton.textContent = "×";
    deleteButton.setAttribute("aria-label", `Delete task ${task.text}`);
    deleteButton.addEventListener("click", () => {
      tasks = tasks.filter((entry) => entry.id !== task.id);
      saveTaskList();
      renderTasks();
    });

    main.append(checkbox, text);
    item.append(main, deleteButton);
    taskList.appendChild(item);
  });
}

function addTask(event) {
  event.preventDefault();

  const value = taskInput.value.trim();
  if (!value) {
    return;
  }

  tasks.unshift({
    id: Date.now() + Math.random(),
    text: value,
    done: false
  });

  saveTaskList();
  renderTasks();
  taskInput.value = "";
  taskInput.focus();
}

function saveSettings() {
  storage.set("pomodoroFocusMinutes", settings.focus);
  storage.set("pomodoroShortBreakMinutes", settings.shortBreak);
  storage.set("pomodoroLongBreakMinutes", settings.longBreak);
  storage.set("pomodoroAutoStart", settings.autoStart);
}

function syncModeValuesFromInputs() {
  settings.focus = Math.max(1, Number.parseInt(focusMinutesInput.value, 10) || defaultSettings.focus);
  settings.shortBreak = Math.max(1, Number.parseInt(shortBreakMinutesInput.value, 10) || defaultSettings.shortBreak);
  settings.longBreak = Math.max(1, Number.parseInt(longBreakMinutesInput.value, 10) || defaultSettings.longBreak);

  modes.focus.minutes = settings.focus;
  modes.shortBreak.minutes = settings.shortBreak;
  modes.longBreak.minutes = settings.longBreak;
  modes.focus.seconds = settings.focus * 60;
  modes.shortBreak.seconds = settings.shortBreak * 60;
  modes.longBreak.seconds = settings.longBreak * 60;

  totalSeconds = modes[currentMode].seconds;
  remainingSeconds = totalSeconds;
  saveSettings();
  updateInterface();
}

function completeTimer() {
  stopTimer({ preserveStatus: true });

  if (currentMode === "focus") {
    const today = getLocalDateKey();
    if (sessionDate !== today) {
      sessionDate = today;
      completedSessions = 0;
      storage.set("pomodoroSessionDate", sessionDate);
    }

    completedSessions += 1;
    focusSessions += 1;
    storage.set("pomodoroSessions", String(completedSessions));
    storage.set("pomodoroSessionDate", today);
    storage.set("pomodoroFocusSessions", String(focusSessions));
    sessionCount.textContent = completedSessions;
  }

  statusOverride = currentMode === "focus" ? "Session complete — nice work!" : "Break complete — back to work!";
  playCompletionSound();
  showNotification(statusOverride);

  const nextMode = currentMode === "focus"
    ? (focusSessions % 4 === 0 ? "longBreak" : "shortBreak")
    : "focus";

  setMode(nextMode, { preserveStatus: true });
  updateStatusText();

  if (settings.autoStart) {
    setTimeout(() => {
      if (!isRunning) {
        startTimer();
      }
    }, 250);
  }
}

function startTimer() {
  if (isRunning) {
    stopTimer();
    return;
  }

  setRunning(true);
  timerId = setInterval(() => {
    remainingSeconds -= 1;
    showTime();

    if (remainingSeconds <= 0) {
      completeTimer();
    }
  }, 1000);
}

function resetTimer() {
  stopTimer();
  remainingSeconds = totalSeconds;
  updateInterface();
}

function skipMode() {
  const currentIndex = modeOrder.indexOf(currentMode);
  const nextMode = modeOrder[(currentIndex + 1) % modeOrder.length];
  setMode(nextMode);
}

function initSettingsInputs() {
  const savedChallenge = Number(settings.dailyGoal);
  settings.dailyGoal = challenges[savedChallenge] ? savedChallenge : defaultSettings.dailyGoal;

  focusMinutesInput.value = settings.focus;
  shortBreakMinutesInput.value = settings.shortBreak;
  longBreakMinutesInput.value = settings.longBreak;
  challengeSelect.value = String(settings.dailyGoal);
  autoStartToggle.checked = settings.autoStart;

  focusMinutesInput.addEventListener("change", syncModeValuesFromInputs);
  shortBreakMinutesInput.addEventListener("change", syncModeValuesFromInputs);
  longBreakMinutesInput.addEventListener("change", syncModeValuesFromInputs);
  challengeSelect.addEventListener("change", () => {
    settings.dailyGoal = Number(challengeSelect.value);
    storage.set("pomodoroDailyGoal", settings.dailyGoal);
    updateGoalProgress();
  });
  autoStartToggle.addEventListener("change", () => {
    settings.autoStart = autoStartToggle.checked;
    saveSettings();
  });
}

startBtn.addEventListener("click", startTimer);
resetBtn.addEventListener("click", resetTimer);
skipBtn.addEventListener("click", skipMode);
modeButtons.forEach((button) => {
  button.addEventListener("click", () => setMode(button.dataset.mode));
});
document.addEventListener("keydown", (event) => {
  const tagName = document.activeElement ? document.activeElement.tagName : "";

  if (event.code === "Space" && !["BUTTON", "INPUT"].includes(tagName)) {
    event.preventDefault();
    startTimer();
  }
});

taskForm.addEventListener("submit", addTask);
themeToggle.addEventListener("click", () => {
  isDarkTheme = !isDarkTheme;
  storage.set("pomodoroDarkTheme", isDarkTheme);
  applyTheme();
});
backgroundSelect.addEventListener("change", () => {
  currentBackground = backgroundSelect.value;
  storage.set("pomodoroBackground", currentBackground);
  applyBackground();
});
musicStyleSelect.addEventListener("change", () => {
  selectedMusicStyle = musicStyleSelect.value;
  storage.set("pomodoroMusicStyle", selectedMusicStyle);
  updateMusicLink();
});
musicPlatformSelect.addEventListener("change", () => {
  selectedMusicPlatform = musicPlatformSelect.value;
  storage.set("pomodoroMusicPlatform", selectedMusicPlatform);
  updateMusicLink();
});

if ("Notification" in window && Notification.permission === "default") {
  Notification.requestPermission();
}

renderTasks();
initSettingsInputs();
applyTheme();
applyBackground();
musicStyleSelect.value = selectedMusicStyle;
musicPlatformSelect.value = selectedMusicPlatform;
updateMusicLink();
updateInterface();
