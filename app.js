(() => {
  const STORAGE_KEYS = {
    tasks: "focusflow.tasks",
    history: "focusflow.history",
    settings: "focusflow.settings",
  };

  const RING_CIRCUMFERENCE = 2 * Math.PI * 100;

  const defaultSettings = { focus: 25, short: 5, long: 15 };

  const el = {
    modeSwitch: document.getElementById("modeSwitch"),
    timeDisplay: document.getElementById("timeDisplay"),
    currentTaskLabel: document.getElementById("currentTaskLabel"),
    ringProgress: document.getElementById("ringProgress"),
    startPauseBtn: document.getElementById("startPauseBtn"),
    resetBtn: document.getElementById("resetBtn"),
    skipBtn: document.getElementById("skipBtn"),
    sessionsToday: document.getElementById("sessionsToday"),
    focusMinutesToday: document.getElementById("focusMinutesToday"),
    streakCount: document.getElementById("streakCount"),
    taskForm: document.getElementById("taskForm"),
    taskInput: document.getElementById("taskInput"),
    taskList: document.getElementById("taskList"),
    taskCount: document.getElementById("taskCount"),
    emptyHint: document.getElementById("emptyHint"),
    focusLen: document.getElementById("focusLen"),
    shortLen: document.getElementById("shortLen"),
    longLen: document.getElementById("longLen"),
    clearHistoryBtn: document.getElementById("clearHistoryBtn"),
    toast: document.getElementById("toast"),
  };

  let tasks = loadJSON(STORAGE_KEYS.tasks, []);
  let history = loadJSON(STORAGE_KEYS.history, {}); // { "YYYY-MM-DD": { sessions, minutes } }
  let settings = loadJSON(STORAGE_KEYS.settings, defaultSettings);

  let mode = "focus";
  let activeTaskId = tasks.length ? tasks[0].id : null;
  let completedFocusSessions = 0; // used to decide long break every 4th
  let remaining = settings.focus * 60;
  let totalForMode = remaining;
  let running = false;
  let timerId = null;

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function uid() {
    return Math.random().toString(36).slice(2, 10);
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function showToast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => el.toast.classList.remove("show"), 2600);
  }

  function modeDurationSeconds(m) {
    return (settings[m] ?? defaultSettings[m]) * 60;
  }

  function setMode(newMode, { resetOnly = false } = {}) {
    mode = newMode;
    document.querySelectorAll(".mode-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.mode === mode);
    });
    totalForMode = modeDurationSeconds(mode);
    remaining = totalForMode;
    updateDisplay();
    if (!resetOnly) stopTimer();
  }

  function updateDisplay() {
    el.timeDisplay.textContent = formatTime(remaining);
    const progress = 1 - remaining / totalForMode;
    el.ringProgress.style.strokeDashoffset = (RING_CIRCUMFERENCE * (1 - progress)).toFixed(1);
    el.ringProgress.style.stroke = mode === "focus" ? "var(--accent)" : "var(--accent-2)";

    const activeTask = tasks.find((t) => t.id === activeTaskId);
    el.currentTaskLabel.textContent = activeTask ? activeTask.text : "No task selected";
    el.startPauseBtn.textContent = running ? "Pause" : remaining === totalForMode ? "Start" : "Resume";
  }

  function tick() {
    remaining -= 1;
    if (remaining <= 0) {
      remaining = 0;
      updateDisplay();
      completeSession();
      return;
    }
    updateDisplay();
  }

  function startTimer() {
    if (running) return;
    running = true;
    timerId = setInterval(tick, 1000);
    updateDisplay();
  }

  function stopTimer() {
    running = false;
    clearInterval(timerId);
    timerId = null;
    updateDisplay();
  }

  function resetTimer() {
    stopTimer();
    remaining = totalForMode;
    updateDisplay();
  }

  function completeSession() {
    stopTimer();

    if (mode === "focus") {
      completedFocusSessions += 1;
      recordHistory(settings.focus);
      const activeTask = tasks.find((t) => t.id === activeTaskId);
      if (activeTask) {
        activeTask.pomos = (activeTask.pomos || 0) + 1;
        saveTasks();
        renderTasks();
      }
      const nextMode = completedFocusSessions % 4 === 0 ? "long" : "short";
      showToast(`Nice work! Time for a ${nextMode === "long" ? "long" : "short"} break.`);
      setMode(nextMode);
    } else {
      showToast("Break's over. Ready to focus?");
      setMode("focus");
    }
    renderStats();
  }

  function recordHistory(minutes) {
    const key = todayKey();
    if (!history[key]) history[key] = { sessions: 0, minutes: 0 };
    history[key].sessions += 1;
    history[key].minutes += minutes;
    saveJSON(STORAGE_KEYS.history, history);
  }

  function computeStreak() {
    let streak = 0;
    const cursor = new Date();
    while (true) {
      const key = cursor.toISOString().slice(0, 10);
      if (history[key] && history[key].sessions > 0) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }

  function renderStats() {
    const today = history[todayKey()] || { sessions: 0, minutes: 0 };
    el.sessionsToday.textContent = today.sessions;
    el.focusMinutesToday.textContent = today.minutes;
    el.streakCount.textContent = computeStreak();
  }

  function saveTasks() {
    saveJSON(STORAGE_KEYS.tasks, tasks);
  }

  function renderTasks() {
    el.taskList.innerHTML = "";
    el.taskCount.textContent = `${tasks.length} task${tasks.length === 1 ? "" : "s"}`;
    el.emptyHint.style.display = tasks.length ? "none" : "block";

    tasks.forEach((task) => {
      const li = document.createElement("li");
      li.className = "task-item" + (task.id === activeTaskId ? " active" : "") + (task.done ? " done" : "");

      const check = document.createElement("div");
      check.className = "task-check";
      check.addEventListener("click", (e) => {
        e.stopPropagation();
        task.done = !task.done;
        saveTasks();
        renderTasks();
      });

      const text = document.createElement("span");
      text.className = "task-text";
      text.textContent = task.text;

      const pomos = document.createElement("span");
      pomos.className = "task-pomos";
      pomos.textContent = task.pomos ? `🍅 ${task.pomos}` : "";

      const remove = document.createElement("button");
      remove.className = "task-remove";
      remove.textContent = "✕";
      remove.addEventListener("click", (e) => {
        e.stopPropagation();
        tasks = tasks.filter((t) => t.id !== task.id);
        if (activeTaskId === task.id) {
          activeTaskId = tasks.length ? tasks[0].id : null;
        }
        saveTasks();
        renderTasks();
        updateDisplay();
      });

      li.addEventListener("click", () => {
        activeTaskId = task.id;
        renderTasks();
        updateDisplay();
      });

      li.append(check, text, pomos, remove);
      el.taskList.appendChild(li);
    });
  }

  function addTask(text) {
    const task = { id: uid(), text, done: false, pomos: 0 };
    tasks.push(task);
    if (!activeTaskId) activeTaskId = task.id;
    saveTasks();
    renderTasks();
    updateDisplay();
  }

  // Event bindings
  el.modeSwitch.addEventListener("click", (e) => {
    const btn = e.target.closest(".mode-btn");
    if (!btn) return;
    setMode(btn.dataset.mode);
  });

  el.startPauseBtn.addEventListener("click", () => {
    if (running) {
      stopTimer();
    } else {
      startTimer();
    }
  });

  el.resetBtn.addEventListener("click", resetTimer);

  el.skipBtn.addEventListener("click", () => {
    remaining = 0;
    completeSession();
  });

  el.taskForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = el.taskInput.value.trim();
    if (!text) return;
    addTask(text);
    el.taskInput.value = "";
  });

  function bindSettingInput(input, key) {
    input.value = settings[key];
    input.addEventListener("change", () => {
      let val = parseInt(input.value, 10);
      if (Number.isNaN(val) || val < 1) val = defaultSettings[key];
      settings[key] = val;
      input.value = val;
      saveJSON(STORAGE_KEYS.settings, settings);
      if (mode === key && !running) {
        totalForMode = modeDurationSeconds(mode);
        remaining = totalForMode;
        updateDisplay();
      }
    });
  }

  bindSettingInput(el.focusLen, "focus");
  bindSettingInput(el.shortLen, "short");
  bindSettingInput(el.longLen, "long");

  el.clearHistoryBtn.addEventListener("click", () => {
    if (!confirm("Clear all session history and stats?")) return;
    history = {};
    saveJSON(STORAGE_KEYS.history, history);
    renderStats();
  });

  // Init
  setMode("focus", { resetOnly: true });
  renderTasks();
  renderStats();
  updateDisplay();
})();
