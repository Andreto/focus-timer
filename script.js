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
const timerCard = document.querySelector('.timer-card');
const settingsOverlay = document.getElementById('settingsOverlay');
const closeSettings = document.getElementById('closeSettings');
const focusInput = document.getElementById('focusInput');
const breakInput = document.getElementById('breakInput');
const saveSettings = document.getElementById('saveSettings');
const topicSelect = document.getElementById('topicSelect');
const topicTimersEl = document.getElementById('topicTimers');
const topicList = document.getElementById('topicList');
const newTopicInput = document.getElementById('newTopicInput');
const addTopicBtn = document.getElementById('addTopicBtn');

let currentTopic = 'misc';
let topics = ['misc'];

function setStatus(isRunning) {
  if (isRunning) {
    modeText.textContent = mode === 'focus' ? 'Focusing' : 'Taking a break';
  } else {
    modeText.textContent = '';
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
  
  // Add to topic-specific time
  const topicKey = dailyTopicKey(currentTopic);
  const topicCurrent = getCookie(topicKey);
  const topicSeconds = topicCurrent ? Number(topicCurrent) || 0 : 0;
  const topicUpdated = topicSeconds + Math.max(0, seconds);
  setCookie(topicKey, String(topicUpdated), 7);
  
  renderTodayTotal();
  renderTopicTimers();
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

function dailyTopicKey(topic) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `focus_${topic}_${yyyy}-${mm}-${dd}`;
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

function loadTopics() {
  const saved = localStorage.getItem('topics');
  if (saved) {
    topics = JSON.parse(saved);
  } else {
    topics = ['misc'];
  }
  renderTopicSelect();
  renderTopicList();
}

function saveTopics() {
  localStorage.setItem('topics', JSON.stringify(topics));
}

function renderTopicSelect() {
  topicSelect.innerHTML = '';
  topics.forEach(topic => {
    const option = document.createElement('option');
    option.value = topic;
    option.textContent = topic.charAt(0).toUpperCase() + topic.slice(1);
    topicSelect.appendChild(option);
  });
  topicSelect.value = currentTopic;
}

function renderTopicList() {
  topicList.innerHTML = '';
  topics.forEach(topic => {
    const item = document.createElement('div');
    item.className = 'topic-item';
    
    const name = document.createElement('span');
    name.className = 'topic-item-name';
    name.textContent = topic;
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-topic-btn';
    removeBtn.textContent = 'Remove';
    removeBtn.onclick = () => removeTopic(topic);
    
    item.appendChild(name);
    if (topics.length > 1) {
      item.appendChild(removeBtn);
    }
    
    topicList.appendChild(item);
  });
}

function addTopic() {
  const newTopic = newTopicInput.value.trim().toLowerCase();
  if (!newTopic) {
    alert('Please enter a topic name');
    return;
  }
  if (topics.includes(newTopic)) {
    alert('Topic already exists');
    return;
  }
  topics.push(newTopic);
  saveTopics();
  renderTopicSelect();
  renderTopicList();
  newTopicInput.value = '';
}

function removeTopic(topic) {
  if (topics.length === 1) {
    alert('You must have at least one topic');
    return;
  }
  topics = topics.filter(t => t !== topic);
  if (currentTopic === topic) {
    currentTopic = topics[0];
    topicSelect.value = currentTopic;
  }
  saveTopics();
  renderTopicSelect();
  renderTopicList();
  renderTopicTimers();
}

function renderTopicTimers() {
  topicTimersEl.innerHTML = '';
  topics.forEach(topic => {
    const topicKey = dailyTopicKey(topic);
    const topicSeconds = getCookie(topicKey) ? Number(getCookie(topicKey)) || 0 : 0;
    
    const item = document.createElement('div');
    item.className = 'summary-item topic-timer-item';
    
    const title = document.createElement('span');
    title.className = 'summary-title';
    title.textContent = topic;
    
    const controlsGroup = document.createElement('div');
    controlsGroup.className = 'topic-timer-controls';
    
    const decreaseBtn = document.createElement('button');
    decreaseBtn.className = 'time-adjust-btn';
    decreaseBtn.textContent = '-15 min';
    decreaseBtn.onclick = () => adjustTopicTime(topic, -15 * 60);
    
    const value = document.createElement('span');
    value.className = 'summary-value';
    value.textContent = formatStopwatch(topicSeconds);
    
    const increaseBtn = document.createElement('button');
    increaseBtn.className = 'time-adjust-btn';
    increaseBtn.textContent = '+15 min';
    increaseBtn.onclick = () => adjustTopicTime(topic, 15 * 60);
    
    controlsGroup.appendChild(decreaseBtn);
    controlsGroup.appendChild(value);
    controlsGroup.appendChild(increaseBtn);
    
    item.appendChild(title);
    item.appendChild(controlsGroup);
    
    topicTimersEl.appendChild(item);
  });
}

function adjustTopicTime(topic, seconds) {
  const topicKey = dailyTopicKey(topic);
  const current = getCookie(topicKey);
  const currentSeconds = current ? Number(current) || 0 : 0;
  const updated = Math.max(0, currentSeconds + seconds);
  setCookie(topicKey, String(updated), 7);
  
  // Update total
  const totalKey = dailyKey();
  const totalCurrent = getCookie(totalKey);
  const totalSeconds = totalCurrent ? Number(totalCurrent) || 0 : 0;
  const totalUpdated = Math.max(0, totalSeconds + seconds);
  setCookie(totalKey, String(totalUpdated), 7);
  
  renderTodayTotal();
  renderTopicTimers();
}

topicSelect.addEventListener('change', () => {
  currentTopic = topicSelect.value;
});

addTopicBtn.addEventListener('click', addTopic);

newTopicInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addTopic();
  }
});

settingsBtn.addEventListener('click', openSettings);
closeSettings.addEventListener('click', closeSettingsModal);
saveSettings.addEventListener('click', handleSaveSettings);

settingsOverlay.addEventListener('click', (e) => {
  if (e.target === settingsOverlay) {
    closeSettingsModal();
  }
});

startBtn.addEventListener('click', handleMainButton);

loadSettings();
loadTopics();
setActiveTab('focus');
renderTodayTotal();
renderTopicTimers();
updateCountdown();
updateStopwatch(0);
updateButtonText();
