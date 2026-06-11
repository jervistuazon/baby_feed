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
const activityModal = document.getElementById("activityModal");
const modalTitle = document.getElementById("modalTitle");
const closeModalButton = document.getElementById("closeModal");
const activityChoiceButtons = document.querySelectorAll(".activity-choice");
const modalNotes = document.getElementById("modalNotes");

let selectedDate = new Date();
let dayData = createEmptyDay();
let activeSlotIndex = null;

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

function getActivityIcons(slot) {
  const icons = [];

  if (slot.milk) {
    icons.push("🍼");
  }

  if (slot.pee) {
    icons.push("💧");
  }

  if (slot.poop) {
    icons.push("💩");
  }

  return icons;
}

function getSlotSummary(slot) {
  const labels = [];

  if (slot.milk) {
    labels.push("feed");
  }

  if (slot.pee) {
    labels.push("pee");
  }

  if (slot.poop) {
    labels.push("poop");
  }

  if (slot.notes) {
    labels.push(`note: ${slot.notes}`);
  }

  return labels.length ? labels.join(", ") : "no entries";
}

function renderGrid() {
  trackerGrid.innerHTML = "";

  dayData.forEach((slot, index) => {
    const cell = document.createElement("button");
    const icons = getActivityIcons(slot);
    const hasEntry = icons.length > 0 || Boolean(slot.notes);

    cell.type = "button";
    cell.className = "time-cell";
    cell.dataset.index = index;
    cell.dataset.hasEntry = String(hasEntry);
    cell.setAttribute("aria-label", `${getSlotTime(index)}: ${getSlotSummary(slot)}. Tap to edit.`);

    const time = document.createElement("span");
    time.className = "time-label";
    time.textContent = getSlotTime(index);

    const iconStrip = document.createElement("span");
    iconStrip.className = "activity-icons";
    iconStrip.textContent = icons.length ? icons.join("") : "+";
    iconStrip.setAttribute("aria-hidden", "true");

    if (slot.notes) {
      const noteDot = document.createElement("span");
      noteDot.className = "note-dot";
      noteDot.textContent = "•";
      noteDot.setAttribute("aria-hidden", "true");
      iconStrip.appendChild(noteDot);
    }

    cell.append(time, iconStrip);
    cell.addEventListener("click", () => openActivityModal(index));
    trackerGrid.appendChild(cell);
  });

  highlightFeedingGaps();
}

function syncModalState() {
  if (activeSlotIndex === null) {
    return;
  }

  const slot = dayData[activeSlotIndex];
  modalTitle.textContent = getSlotTime(activeSlotIndex);
  modalNotes.value = slot.notes;

  activityChoiceButtons.forEach((button) => {
    const type = button.dataset.type;
    button.setAttribute("aria-pressed", String(slot[type]));
  });
}

function openActivityModal(index) {
  activeSlotIndex = index;
  syncModalState();
  activityModal.hidden = false;
  document.body.classList.add("modal-open");
  activityChoiceButtons[0]?.focus();
}

function closeActivityModal() {
  activityModal.hidden = true;
  document.body.classList.remove("modal-open");
  activeSlotIndex = null;
}

function toggleActivity(type) {
  if (activeSlotIndex === null) {
    return;
  }

  dayData[activeSlotIndex][type] = !dayData[activeSlotIndex][type];
  saveDay();
  renderGrid();
  syncModalState();
}

function updateModalNotes() {
  if (activeSlotIndex === null) {
    return;
  }

  dayData[activeSlotIndex].notes = modalNotes.value;
  saveDay();
  renderGrid();
  syncModalState();
}

function updateSummary() {
  milkTotal.textContent = dayData.filter((slot) => slot.milk).length;
  peeTotal.textContent = dayData.filter((slot) => slot.pee).length;
  poopTotal.textContent = dayData.filter((slot) => slot.poop).length;
}

function highlightFeedingGaps() {
  const cells = trackerGrid.querySelectorAll(".time-cell");
  cells.forEach((cell) => cell.classList.remove("warning-gap"));

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
      cells[index]?.classList.add("warning-gap");
    }
  });

  if (warningRanges.length) {
    feedingGapNotice.hidden = false;
    feedingGapNotice.textContent = "Milk gap warning: highlighted time blocks show stretches longer than 3 hours without a milk entry.";
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

activityChoiceButtons.forEach((button) => {
  button.addEventListener("click", () => toggleActivity(button.dataset.type));
});

modalNotes.addEventListener("input", updateModalNotes);
closeModalButton.addEventListener("click", closeActivityModal);
activityModal.addEventListener("click", (event) => {
  if (event.target === activityModal) {
    closeActivityModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !activityModal.hidden) {
    closeActivityModal();
  }
});

previousDayButton.addEventListener("click", () => changeDay(-1));
todayButton.addEventListener("click", goToToday);
nextDayButton.addEventListener("click", () => changeDay(1));
clearDayButton.addEventListener("click", clearDay);
exportCsvButton.addEventListener("click", exportCsv);
backupJsonButton.addEventListener("click", backupJson);
darkModeToggle.addEventListener("click", toggleDarkMode);

applyDarkModePreference();
loadDay();
