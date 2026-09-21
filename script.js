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
const weeklyChartEl = document.getElementById('weeklyChart');
const weeklyTotalEl = document.getElementById('weeklyTotal');
const reportRangeEl = document.getElementById('reportRange');
const reportFiltersEl = document.getElementById('reportFilters');
const chartAxisEl = document.getElementById('chartAxis');
const previousWeekBtn = document.getElementById('previousWeek');
const nextWeekBtn = document.getElementById('nextWeek');
const timerPageEl = document.getElementById('timerPage');
const reportsPageEl = document.getElementById('reportsPage');
const timerPageBtn = document.getElementById('timerPageBtn');
const reportsPageBtn = document.getElementById('reportsPageBtn');
const timerNav = document.getElementById('timerNav');

let currentTopic = 'misc';
let topics = ['misc'];
let visibleReportTopics = new Set();
let reportWeekOffset = 0;

const REPORTS_STORAGE_KEY = 'focusReports.v1';
const TOPIC_COLORS = ['#5cf0ff', '#ff8ab7', '#a78bfa', '#fbbf24', '#4ade80', '#fb7185', '#60a5fa'];

function dateId(date = new Date()) { return date.toLocaleDateString('en-CA'); }
function getReports() {
  try { const reports = JSON.parse(localStorage.getItem(REPORTS_STORAGE_KEY) || '{}'); return reports && typeof reports === 'object' ? reports : {}; }
  catch { return {}; }
}
function saveReports(reports) {
  try { localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(reports)); }
  catch (error) { console.warn('Focus history could not be saved; browser storage may be full.', error); }
}
function reportForToday() {
  const reports = getReports(), key = dateId();
  reports[key] ||= { total: 0, topics: {} };
  reports[key].topics ||= {};
  return { reports, report: reports[key] };
}
function getTodaySeconds() { return Number(getReports()[dateId()]?.total) || 0; }
function getTodayTopicSeconds(topic) { return Number(getReports()[dateId()]?.topics?.[topic]) || 0; }
function migrateTodayFromLegacyCookies() {
  const reports = getReports(), key = dateId();
  if (reports[key]) return;
  const total = Number(getCookie(dailyKey())) || 0;
  const legacyTopics = Object.fromEntries(topics.map(topic => [topic, Number(getCookie(dailyTopicKey(topic))) || 0]).filter(([, seconds]) => seconds));
  if (total || Object.keys(legacyTopics).length) {
    reports[key] = { total, topics: legacyTopics };
    saveReports(reports);
  }
}
function formatCompactTime(seconds) { const hours = Math.floor(seconds / 3600), minutes = Math.floor((seconds % 3600) / 60); return hours ? `${hours}h ${minutes}m` : `${minutes}m`; }
function topicColor(topic) { return TOPIC_COLORS[topics.indexOf(topic) % TOPIC_COLORS.length]; }

function renderWeeklyReport() {
  const reports = getReports(), today = new Date();
  today.setHours(0, 0, 0, 0);
  const monday = new Date(today);
  const daysSinceMonday = (today.getDay() + 6) % 7;
  monday.setDate(today.getDate() - daysSinceMonday - reportWeekOffset * 7);
  const days = Array.from({ length: 7 }, (_, i) => { const day = new Date(monday); day.setDate(monday.getDate() + i); return day; });
  if (!visibleReportTopics.size) topics.forEach(topic => visibleReportTopics.add(topic));
  const visibleTopics = topics.filter(topic => visibleReportTopics.has(topic));
  reportFiltersEl.innerHTML = '';
  topics.forEach(topic => {
    const label = document.createElement('label'); label.className = 'report-filter'; label.style.setProperty('--topic-color', topicColor(topic));
    label.innerHTML = `<input type="checkbox" ${visibleReportTopics.has(topic) ? 'checked' : ''}><span class="filter-dot"></span><span>${topic}</span>`;
    label.querySelector('input').addEventListener('change', event => { event.target.checked ? visibleReportTopics.add(topic) : visibleReportTopics.delete(topic); renderWeeklyReport(); });
    reportFiltersEl.appendChild(label);
  });
  const totals = days.map(day => visibleTopics.reduce((sum, topic) => sum + (Number(reports[dateId(day)]?.topics?.[topic]) || 0), 0));
  const max = Math.max(Math.ceil(Math.max(...totals, 1) / 3600) * 3600, 3600);
  chartAxisEl.innerHTML = [max, max * .75, max * .5, max * .25, 0].map(value => `<span>${value ? formatCompactTime(value) : '0h'}</span>`).join('');
  weeklyChartEl.innerHTML = '';
  days.forEach((day, index) => {
    const total = totals[index], item = document.createElement('div'); item.className = 'chart-day';
    const segments = visibleTopics.map(topic => {
      const seconds = Number(reports[dateId(day)]?.topics?.[topic]) || 0;
      const label = seconds / max >= .12 ? `<span class="chart-segment-label">${formatCompactTime(seconds)}</span>` : '';
      return seconds ? `<div class="chart-segment" title="${topic}: ${formatStopwatch(seconds)}" style="height:${(seconds / max) * 100}%;background:${topicColor(topic)}">${label}</div>` : '';
    }).join('');
    item.innerHTML = `<span class="chart-value">${total ? formatCompactTime(total) : '—'}</span><div class="chart-bar-area">${segments}</div><span class="chart-label">${day.toLocaleDateString(undefined, { weekday: 'short' })}</span>`;
    weeklyChartEl.appendChild(item);
  });
  weeklyTotalEl.textContent = `Selected categories this week: ${formatStopwatch(totals.reduce((sum, value) => sum + value, 0))}`;
  reportRangeEl.textContent = `${days[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${days[6].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  nextWeekBtn.disabled = reportWeekOffset === 0;
}

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
  const { reports, report } = reportForToday();
  const added = Math.max(0, seconds);
  report.total = (Number(report.total) || 0) + added;
  report.topics[currentTopic] = (Number(report.topics[currentTopic]) || 0) + added;
  saveReports(reports);
  
  renderTodayTotal();
  renderTopicTimers();
  renderWeeklyReport();
}

function showPage(page) {
  const showingReports = page === 'reports';
  timerPageEl.hidden = showingReports;
  reportsPageEl.hidden = !showingReports;
  timerPageBtn.classList.toggle('active', !showingReports);
  reportsPageBtn.classList.toggle('active', showingReports);
  if (showingReports) renderWeeklyReport();
}

function renderTodayTotal() {
  todayTotalEl.textContent = formatStopwatch(getTodaySeconds());
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
  renderWeeklyReport();
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
  renderWeeklyReport();
}

// Run createMockFocusData() in DevTools to populate the report with 28 days of sample data.
window.createMockFocusData = function createMockFocusData() {
  const sampleTopics = [...new Set([...topics, 'work', 'study', 'exercise'])];
  topics = sampleTopics;
  saveTopics();
  const reports = getReports();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let offset = 0; offset < 28; offset += 1) {
    const day = new Date(today); day.setDate(today.getDate() - offset);
    const dayTopics = {};
    sampleTopics.forEach((topic, index) => {
      const isRestDay = day.getDay() === 0 && index > 0;
      const minutes = isRestDay ? 0 : Math.floor(Math.random() * (index === 0 ? 45 : 110));
      if (minutes) dayTopics[topic] = minutes * 60;
    });
    reports[dateId(day)] = { total: Object.values(dayTopics).reduce((sum, seconds) => sum + seconds, 0), topics: dayTopics };
  }
  saveReports(reports);
  visibleReportTopics = new Set(topics);
  renderTopicSelect(); renderTopicList(); renderTodayTotal(); renderTopicTimers(); renderWeeklyReport();
  console.info('Mock focus data created for the last 28 days.');
};

function renderTopicTimers() {
  topicTimersEl.innerHTML = '';
  topics.forEach(topic => {
    const topicSeconds = getTodayTopicSeconds(topic);
    
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
  const { reports, report } = reportForToday();
  const currentSeconds = Number(report.topics[topic]) || 0;
  const updated = Math.max(0, currentSeconds + seconds);
  const appliedChange = updated - currentSeconds;
  report.topics[topic] = updated;
  report.total = Math.max(0, (Number(report.total) || 0) + appliedChange);
  saveReports(reports);
  
  renderTodayTotal();
  renderTopicTimers();
  renderWeeklyReport();
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
timerPageBtn.addEventListener('click', () => showPage('timer'));
timerNav.addEventListener('click', event => { event.preventDefault(); showPage('timer'); });
reportsPageBtn.addEventListener('click', () => showPage('reports'));
previousWeekBtn.addEventListener('click', () => { reportWeekOffset += 1; renderWeeklyReport(); });
nextWeekBtn.addEventListener('click', () => { reportWeekOffset = Math.max(0, reportWeekOffset - 1); renderWeeklyReport(); });

loadSettings();
loadTopics();
migrateTodayFromLegacyCookies();
setActiveTab('focus');
renderTodayTotal();
renderTopicTimers();
renderWeeklyReport();
updateCountdown();
updateStopwatch(0);
updateButtonText();
