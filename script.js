let focusDurationSeconds = 45 * 60;
let breakDurationSeconds = 10 * 60;

let mode = 'focus';
let countdownSeconds = focusDurationSeconds;
let countdownTimer = null;
let stopwatchTimer = null;
let stopwatchStart = null;
let stopwatchAccumulated = 0;
let isRunning = false;

const countdownEl = document.getElementById('countdown');
const stopwatchEl = document.getElementById('stopwatch');
const startBtn = document.getElementById('startBtn');
const todayTotalEl = document.getElementById('todayTotal');
const stopwatchLabel = document.getElementById('stopwatchLabel');
const modeText = document.getElementById('modeText');
const settingsBtn = document.getElementById('settingsBtn');
const decreaseBtn = document.getElementById('decreaseBtn');
const increaseBtn = document.getElementById('increaseBtn');
const timerCard = document.querySelector('.timer-card');
const settingsOverlay = document.getElementById('settingsOverlay');
const closeSettings = document.getElementById('closeSettings');
const focusInput = document.getElementById('focusInput');
const breakInput = document.getElementById('breakInput');
const saveSettings = document.getElementById('saveSettings');

function setStatus(isRunning) {
  if (isRunning) {
    modeText.textContent = mode === 'focus' ? 'Focusing' : 'Taking a break';
    if (mode === 'focus') {
      timerCard.style.borderTopColor = '#873131';
      timerCard.style.borderTopWidth = '4px';
    } else {
      timerCard.style.borderTopColor = '#374d8a';
      timerCard.style.borderTopWidth = '4px';
    }
  } else {
    modeText.textContent = '';
    timerCard.style.borderTopColor = 'rgba(255, 255, 255, 0.08)';
    timerCard.style.borderTopWidth = '1px';
  }
}

function updateButtonText() {
  if (!isRunning) {
    startBtn.textContent = mode === 'focus' ? 'Start Focusing' : 'Start Break';
  } else {
    startBtn.textContent = mode === 'focus' ? 'Break' : 'Focus';
  }
}

function setActiveTab(targetMode) {
  mode = targetMode;
  const isFocus = mode === 'focus';
  stopwatchLabel.textContent = isFocus ? 'Focus stopwatch (manual)' : 'Break stopwatch (manual)';
  clearInterval(countdownTimer);
  clearInterval(stopwatchTimer);
  stopwatchStart = null;
  stopwatchAccumulated = 0;
  countdownSeconds = isFocus ? focusDurationSeconds : breakDurationSeconds;
  updateCountdown();
  updateStopwatch(0);
  isRunning = false;
  updateButtonText();
  setStatus(false);
}

function updateCountdown() {
  const timeDisplay = formatCountdown(countdownSeconds);
  countdownEl.textContent = timeDisplay;
  document.title = timeDisplay;
}

function formatCountdown(totalSeconds) {
  const mins = Math.floor(Math.max(0, totalSeconds) / 60);
  const secs = Math.max(0, totalSeconds) % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function updateStopwatch(totalMilliseconds) {
  const totalSeconds = Math.floor(totalMilliseconds / 1000);
  stopwatchEl.textContent = formatStopwatch(totalSeconds);
}

function formatStopwatch(totalSeconds) {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function startCountdown() {
  clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    countdownSeconds -= 1;
    if (countdownSeconds <= 0) {
      countdownSeconds = 0;
      clearInterval(countdownTimer);
    }
    updateCountdown();
  }, 1000);
}

function startStopwatch() {
  clearInterval(stopwatchTimer);
  stopwatchStart = Date.now();
  stopwatchTimer = setInterval(() => {
    const elapsed = stopwatchAccumulated + (Date.now() - stopwatchStart);
    updateStopwatch(elapsed);
  }, 250);
  isRunning = true;
  updateButtonText();
  setStatus(true);
}

function stopStopwatch() {
  if (stopwatchStart) {
    stopwatchAccumulated += Date.now() - stopwatchStart;
  }
  clearInterval(stopwatchTimer);
  stopwatchStart = null;
  isRunning = false;
  setStatus(false);
  return stopwatchAccumulated;
}

function resetTimersForMode(targetMode) {
  clearInterval(countdownTimer);
  clearInterval(stopwatchTimer);
  stopwatchStart = null;
  stopwatchAccumulated = 0;
  countdownSeconds = targetMode === 'focus' ? focusDurationSeconds : breakDurationSeconds;
  updateCountdown();
  updateStopwatch(0);
  setStatus(false);
}

function handleStart() {
  clearInterval(countdownTimer);
  startCountdown();
  startStopwatch();
}

function handleMainButton() {
  if (!isRunning) {
    handleStart();
  } else {
    const elapsedMs = stopStopwatch();
    clearInterval(countdownTimer);
    if (mode === 'focus') {
      addFocusToToday(Math.floor(elapsedMs / 1000));
      setActiveTab('break');
    } else {
      setActiveTab('focus');
    }
    handleStart();
  }
}

function addFocusToToday(seconds) {
  const key = dailyKey();
  const current = getCookie(key);
  const currentSeconds = current ? Number(current) || 0 : 0;
  const updated = currentSeconds + Math.max(0, seconds);
  setCookie(key, String(updated), 7);
  renderTodayTotal();
}

function renderTodayTotal() {
  const key = dailyKey();
  const current = getCookie(key);
  const seconds = current ? Number(current) || 0 : 0;
  todayTotalEl.textContent = formatStopwatch(seconds);
}

function dailyKey() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `focus_total_${yyyy}-${mm}-${dd}`;
}

function setCookie(name, value, days) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

function getCookie(name) {
  const value = document.cookie.split('; ').find(row => row.startsWith(name + '='));
  return value ? decodeURIComponent(value.split('=')[1]) : null;
}

function loadSettings() {
  const savedFocusMins = localStorage.getItem('focusDurationMins');
  const savedBreakMins = localStorage.getItem('breakDurationMins');
  
  if (savedFocusMins) {
    focusDurationSeconds = parseInt(savedFocusMins) * 60;
    focusInput.value = savedFocusMins;
  } else {
    focusInput.value = focusDurationSeconds / 60;
  }
  
  if (savedBreakMins) {
    breakDurationSeconds = parseInt(savedBreakMins) * 60;
    breakInput.value = savedBreakMins;
  } else {
    breakInput.value = breakDurationSeconds / 60;
  }
}

function openSettings() {
  settingsOverlay.classList.add('active');
}

function closeSettingsModal() {
  settingsOverlay.classList.remove('active');
}

function handleSaveSettings() {
  const focusMins = parseInt(focusInput.value);
  const breakMins = parseInt(breakInput.value);
  
  if (focusMins < 1 || focusMins > 120 || breakMins < 1 || breakMins > 60) {
    alert('Please enter valid durations');
    return;
  }
  
  focusDurationSeconds = focusMins * 60;
  breakDurationSeconds = breakMins * 60;
  
  localStorage.setItem('focusDurationMins', String(focusMins));
  localStorage.setItem('breakDurationMins', String(breakMins));
  
  setActiveTab(mode);
  closeSettingsModal();
}

settingsBtn.addEventListener('click', openSettings);
closeSettings.addEventListener('click', closeSettingsModal);
saveSettings.addEventListener('click', handleSaveSettings);

settingsOverlay.addEventListener('click', (e) => {
  if (e.target === settingsOverlay) {
    closeSettingsModal();
  }
});

startBtn.addEventListener('click', handleMainButton);

decreaseBtn.addEventListener('click', () => {
  adjustTodayTotal(-15 * 60);
});

increaseBtn.addEventListener('click', () => {
  adjustTodayTotal(15 * 60);
});

function adjustTodayTotal(seconds) {
  const key = dailyKey();
  const current = getCookie(key);
  const currentSeconds = current ? Number(current) || 0 : 0;
  const updated = Math.max(0, currentSeconds + seconds);
  setCookie(key, String(updated), 7);
  renderTodayTotal();
}

loadSettings();
setActiveTab('focus');
renderTodayTotal();
updateCountdown();
updateStopwatch(0);
updateButtonText();
