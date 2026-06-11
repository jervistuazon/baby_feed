const TRACKER_PREFIX = "anya-tracker-";
const DARK_MODE_KEY = "anya-tracker-dark-mode";
const SLOT_MINUTES = 30;
const TOTAL_SLOTS = 48;
const THREE_HOURS_IN_SLOTS = 6;

const selectedDateText = document.getElementById("selectedDateText");
const previousDayButton = document.getElementById("previousDay");
const todayButton = document.getElementById("todayButton");
const nextDayButton = document.getElementById("nextDay");
const trackerGrid = document.getElementById("trackerGrid");
const milkTotal = document.getElementById("milkTotal");
const peeTotal = document.getElementById("peeTotal");
const poopTotal = document.getElementById("poopTotal");
const clearDayButton = document.getElementById("clearDay");
const exportCsvButton = document.getElementById("exportCsv");
const backupJsonButton = document.getElementById("backupJson");
const darkModeToggle = document.getElementById("darkModeToggle");
const feedingGapNotice = document.getElementById("feedingGapNotice");

let selectedDate = new Date();
let dayData = createEmptyDay();

function createEmptyDay() {
  return Array.from({ length: TOTAL_SLOTS }, () => ({
    milk: false,
    pee: false,
    poop: false,
    notes: ""
  }));
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function getDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getStorageKey(date = selectedDate) {
  return `${TRACKER_PREFIX}${getDateKey(date)}`;
}

function formatDisplayDate(date) {
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function getSlotTime(index) {
  const totalMinutes = index * SLOT_MINUTES;
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;

  return `${hours12}:${pad(minutes)} ${period}`;
}

function normalizeLoadedData(savedData) {
  const emptyDay = createEmptyDay();

  if (!Array.isArray(savedData)) {
    return emptyDay;
  }

  return emptyDay.map((slot, index) => ({
    ...slot,
    ...(savedData[index] || {}),
    notes: savedData[index]?.notes || ""
  }));
}

function loadDay() {
  const saved = localStorage.getItem(getStorageKey());

  try {
    dayData = normalizeLoadedData(saved ? JSON.parse(saved) : null);
  } catch (error) {
    dayData = createEmptyDay();
  }

  selectedDateText.textContent = formatDisplayDate(selectedDate);
  renderGrid();
  updateSummary();
}

function saveDay() {
  localStorage.setItem(getStorageKey(), JSON.stringify(dayData));
  updateSummary();
}

function renderGrid() {
  trackerGrid.innerHTML = "";

  dayData.forEach((slot, index) => {
    const row = document.createElement("div");
    row.className = "tracker-row";
    row.dataset.index = index;

    const time = document.createElement("div");
    time.className = "time-label";
    time.textContent = getSlotTime(index);

    const milkButton = createToggleButton("milk", slot.milk, index);
    const peeButton = createToggleButton("pee", slot.pee, index);
    const poopButton = createToggleButton("poop", slot.poop, index);

    const notesInput = document.createElement("input");
    notesInput.className = "notes-input";
    notesInput.type = "text";
    notesInput.maxLength = 80;
    notesInput.placeholder = "Short note";
    notesInput.value = slot.notes;
    notesInput.setAttribute("aria-label", `Notes for ${getSlotTime(index)}`);
    notesInput.addEventListener("input", () => {
      dayData[index].notes = notesInput.value;
      saveDay();
    });

    row.append(time, milkButton, peeButton, poopButton, notesInput);
    trackerGrid.appendChild(row);
  });

  highlightFeedingGaps();
}

function createToggleButton(type, isActive, index) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `pill-toggle ${type}`;
  button.textContent = type.charAt(0).toUpperCase() + type.slice(1);
  button.setAttribute("aria-pressed", String(isActive));
  button.setAttribute("aria-label", `${button.textContent} at ${getSlotTime(index)}`);
  button.addEventListener("click", () => {
    dayData[index][type] = !dayData[index][type];
    button.setAttribute("aria-pressed", String(dayData[index][type]));
    saveDay();
    highlightFeedingGaps();
  });

  return button;
}

function updateSummary() {
  milkTotal.textContent = dayData.filter((slot) => slot.milk).length;
  peeTotal.textContent = dayData.filter((slot) => slot.pee).length;
  poopTotal.textContent = dayData.filter((slot) => slot.poop).length;
}

function highlightFeedingGaps() {
  const rows = trackerGrid.querySelectorAll(".tracker-row");
  rows.forEach((row) => row.classList.remove("warning-gap"));

  const milkIndexes = dayData
    .map((slot, index) => (slot.milk ? index : null))
    .filter((index) => index !== null);

  const warningRanges = [];

  for (let i = 0; i < milkIndexes.length - 1; i += 1) {
    const start = milkIndexes[i];
    const end = milkIndexes[i + 1];

    if (end - start > THREE_HOURS_IN_SLOTS) {
      warningRanges.push({ start: start + 1, end: end - 1 });
    }
  }

  if (milkIndexes.length === 0) {
    warningRanges.push({ start: 0, end: TOTAL_SLOTS - 1 });
  } else {
    const firstMilk = milkIndexes[0];
    const lastMilk = milkIndexes[milkIndexes.length - 1];

    if (firstMilk > THREE_HOURS_IN_SLOTS) {
      warningRanges.push({ start: 0, end: firstMilk - 1 });
    }

    if (TOTAL_SLOTS - 1 - lastMilk > THREE_HOURS_IN_SLOTS) {
      warningRanges.push({ start: lastMilk + 1, end: TOTAL_SLOTS - 1 });
    }
  }

  warningRanges.forEach(({ start, end }) => {
    for (let index = start; index <= end; index += 1) {
      rows[index]?.classList.add("warning-gap");
    }
  });

  if (warningRanges.length) {
    feedingGapNotice.hidden = false;
    feedingGapNotice.textContent = "Milk gap warning: highlighted rows show stretches longer than 3 hours without a milk entry.";
  } else {
    feedingGapNotice.hidden = true;
    feedingGapNotice.textContent = "";
  }
}

function changeDay(offset) {
  selectedDate.setDate(selectedDate.getDate() + offset);
  loadDay();
}

function goToToday() {
  selectedDate = new Date();
  loadDay();
}

function clearDay() {
  const dateText = formatDisplayDate(selectedDate);
  const confirmed = window.confirm(`Clear all tracker entries for ${dateText}?`);

  if (!confirmed) {
    return;
  }

  localStorage.removeItem(getStorageKey());
  dayData = createEmptyDay();
  renderGrid();
  updateSummary();
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsv(value) {
  const stringValue = String(value ?? "");
  return `"${stringValue.replaceAll('"', '""')}"`;
}

function exportCsv() {
  const rows = ["Date,Time,Milk,Pee,Poop,Notes"];
  const dateKey = getDateKey(selectedDate);

  dayData.forEach((slot, index) => {
    rows.push([
      dateKey,
      getSlotTime(index),
      slot.milk ? "Yes" : "No",
      slot.pee ? "Yes" : "No",
      slot.poop ? "Yes" : "No",
      slot.notes
    ].map(escapeCsv).join(","));
  });

  downloadFile(`anya-tracker-${dateKey}.csv`, rows.join("\n"), "text/csv;charset=utf-8");
}

function backupJson() {
  const backup = {};

  Object.keys(localStorage)
    .filter((key) => key.startsWith(TRACKER_PREFIX))
    .sort()
    .forEach((key) => {
      try {
        backup[key] = JSON.parse(localStorage.getItem(key));
      } catch (error) {
        backup[key] = localStorage.getItem(key);
      }
    });

  downloadFile(
    `anya-tracker-backup-${getDateKey(new Date())}.json`,
    JSON.stringify(backup, null, 2),
    "application/json;charset=utf-8"
  );
}

function applyDarkModePreference() {
  const isDark = localStorage.getItem(DARK_MODE_KEY) === "true";
  document.body.classList.toggle("dark-mode", isDark);
  darkModeToggle.textContent = isDark ? "☀️" : "🌙";
  darkModeToggle.setAttribute("aria-pressed", String(isDark));
}

function toggleDarkMode() {
  const nextValue = !document.body.classList.contains("dark-mode");
  localStorage.setItem(DARK_MODE_KEY, String(nextValue));
  applyDarkModePreference();
}

previousDayButton.addEventListener("click", () => changeDay(-1));
todayButton.addEventListener("click", goToToday);
nextDayButton.addEventListener("click", () => changeDay(1));
clearDayButton.addEventListener("click", clearDay);
exportCsvButton.addEventListener("click", exportCsv);
backupJsonButton.addEventListener("click", backupJson);
darkModeToggle.addEventListener("click", toggleDarkMode);

applyDarkModePreference();
loadDay();
