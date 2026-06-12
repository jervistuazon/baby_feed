const APP_VERSION = "2026.06.12.5";
const TRACKER_PREFIX = "anya-tracker-";
const SLOT_MINUTES = 30;
const TOTAL_SLOTS = 48;
const THREE_HOURS_IN_SLOTS = 6;
const FEED_WINDOW_DELAY_SLOTS = 4;
const FEED_WINDOW_DURATION_SLOTS = 2;
const ICONS = {
  milk: "\u{1F37C}",
  pee: "\u{1F4A7}",
  poop: "\u{1F4A9}",
  notes: "\u{1F4AC}"
};
const TIME_SECTIONS = [
  { label: "Night", start: 0, end: 11, detail: "12 AM-6 AM" },
  { label: "Morning", start: 12, end: 23, detail: "6 AM-12 PM" },
  { label: "Afternoon", start: 24, end: 35, detail: "12 PM-6 PM" },
  { label: "Evening", start: 36, end: 47, detail: "6 PM-12 AM" }
];

document.documentElement.dataset.appVersion = APP_VERSION;

const selectedDateText = document.getElementById("selectedDateText");
const dailyPanel = document.querySelector(".daily-panel");
const previousDayButton = document.getElementById("previousDay");
const todayButton = document.getElementById("todayButton");
const nextDayButton = document.getElementById("nextDay");
const trackerGrid = document.getElementById("trackerGrid");
const milkTotal = document.getElementById("milkTotal");
const peeTotal = document.getElementById("peeTotal");
const poopTotal = document.getElementById("poopTotal");
const notesTotal = document.getElementById("notesTotal");
const lastMilkTime = document.getElementById("lastMilkTime");
const nextFeedTime = document.getElementById("nextFeedTime");
const clearDayButton = document.getElementById("clearDay");
const exportCsvButton = document.getElementById("exportCsv");
const backupJsonButton = document.getElementById("backupJson");
const settingsButton = document.getElementById("settingsButton");
const activityModal = document.getElementById("activityModal");
const modalDateLabel = document.getElementById("modalDateLabel");
const modalTitle = document.getElementById("modalTitle");
const closeModalButton = document.getElementById("closeModal");
const saveEntryButton = document.getElementById("saveEntry");
const deleteEntryButton = document.getElementById("deleteEntry");
const activityChoiceButtons = document.querySelectorAll(".activity-choice");
const modalNotes = document.getElementById("modalNotes");

let selectedDate = new Date();
let dayData = createEmptyDay();
let activeSlotIndex = null;
let activeSlotDraft = null;

function createEmptySlot() {
  return {
    milk: false,
    pee: false,
    poop: false,
    notes: ""
  };
}

function createEmptyDay() {
  return Array.from({ length: TOTAL_SLOTS }, () => createEmptySlot());
}

function copySlot(slot) {
  return {
    milk: Boolean(slot?.milk),
    pee: Boolean(slot?.pee),
    poop: Boolean(slot?.poop),
    notes: slot?.notes || ""
  };
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
    month: "short",
    day: "numeric"
  });
}

function formatFullDate(date) {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

function isToday(date) {
  return getDateKey(date) === getDateKey(new Date());
}

function getSlotTime(index) {
  const totalMinutes = index * SLOT_MINUTES;
  const hours24 = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;

  return `${hours12}:${pad(minutes)} ${period}`;
}

function getSlotRangeLabel(startIndex, endIndex) {
  const endLabel = endIndex >= TOTAL_SLOTS ? "Midnight" : getSlotTime(endIndex);
  return `${getSlotTime(startIndex)}-${endLabel}`;
}

function getCurrentSlotIndex() {
  const now = new Date();
  const totalMinutes = now.getHours() * 60 + now.getMinutes();

  return Math.min(TOTAL_SLOTS - 1, Math.floor(totalMinutes / SLOT_MINUTES));
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

  selectedDateText.textContent = isToday(selectedDate) ? "Today" : formatDisplayDate(selectedDate);
  updateStickyOffset();
  renderGrid();
  updateSummary();
}

function saveDay() {
  localStorage.setItem(getStorageKey(), JSON.stringify(dayData));
  updateSummary();
}

function getSlotActivities(slot) {
  const activities = [];

  if (slot.milk) {
    activities.push({ icon: ICONS.milk, className: "milk-icon", label: "milk" });
  }

  if (slot.pee) {
    activities.push({ icon: ICONS.pee, className: "pee-icon", label: "pee" });
  }

  if (slot.poop) {
    activities.push({ icon: ICONS.poop, className: "poop-icon", label: "poop" });
  }

  if (slot.notes) {
    activities.push({ icon: ICONS.notes, className: "notes-icon", label: "note" });
  }

  return activities;
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

function getMilkIndexes() {
  return dayData
    .map((slot, index) => (slot.milk ? index : null))
    .filter((index) => index !== null);
}

function getLastMilkIndex() {
  const milkIndexes = getMilkIndexes();

  if (!milkIndexes.length) {
    return null;
  }

  if (!isToday(selectedDate)) {
    return milkIndexes[milkIndexes.length - 1];
  }

  const currentSlotIndex = getCurrentSlotIndex();
  return [...milkIndexes].reverse().find((index) => index <= currentSlotIndex) ?? milkIndexes[milkIndexes.length - 1];
}

function getNextFeedWindow() {
  const anchorIndex = getLastMilkIndex();

  if (anchorIndex === null) {
    return null;
  }

  const start = anchorIndex + FEED_WINDOW_DELAY_SLOTS;

  if (start >= TOTAL_SLOTS) {
    return null;
  }

  return {
    anchorIndex,
    start,
    end: Math.min(TOTAL_SLOTS - 1, start + FEED_WINDOW_DURATION_SLOTS - 1)
  };
}

function getPromptSlotIndex() {
  if (!isToday(selectedDate)) {
    return null;
  }

  const currentIndex = getCurrentSlotIndex();

  if (!getSlotActivities(dayData[currentIndex]).length) {
    return currentIndex;
  }

  for (let index = currentIndex + 1; index < TOTAL_SLOTS; index += 1) {
    if (!getSlotActivities(dayData[index]).length) {
      return index;
    }
  }

  return null;
}

function triggerSlotFeedback(cell) {
  cell.classList.remove("slot-tapped");
  window.requestAnimationFrame(() => {
    cell.classList.add("slot-tapped");
    window.setTimeout(() => cell.classList.remove("slot-tapped"), 260);
  });
}

function createTimeCell(slot, index, promptSlotIndex, currentSlotIndex) {
  const cell = document.createElement("button");
  const activities = getSlotActivities(slot);
  const hasEntry = activities.length > 0;
  const isCurrent = isToday(selectedDate) && index === currentSlotIndex;
  const isOldEmpty = isToday(selectedDate) && !hasEntry && index < currentSlotIndex;
  const isPromptSlot = index === promptSlotIndex;

  cell.type = "button";
  cell.className = "time-cell";
  cell.dataset.index = index;
  cell.dataset.hasEntry = String(hasEntry);
  cell.setAttribute("aria-label", `${getSlotTime(index)}: ${getSlotSummary(slot)}. Tap to edit.`);

  if (isCurrent) {
    cell.classList.add("is-current");
  }

  if (isOldEmpty) {
    cell.classList.add("is-old-empty");
  }

  const timelineDot = document.createElement("span");
  timelineDot.className = "timeline-dot";
  timelineDot.setAttribute("aria-hidden", "true");

  const time = document.createElement("span");
  time.className = "time-label";
  time.textContent = getSlotTime(index);

  const iconStrip = document.createElement("span");
  iconStrip.className = hasEntry ? "activity-icons" : "activity-icons is-empty";
  iconStrip.setAttribute("aria-hidden", "true");

  if (hasEntry) {
    activities.forEach((activity) => {
      const activityIcon = document.createElement("span");
      activityIcon.className = `activity-icon-pill ${activity.className}`;
      activityIcon.textContent = activity.icon;
      iconStrip.appendChild(activityIcon);
    });
  } else if (isPromptSlot) {
    iconStrip.classList.add("tap-prompt");
    iconStrip.textContent = "Tap to add";
  } else {
    iconStrip.textContent = "+";
  }

  cell.append(timelineDot, time, iconStrip);
  cell.addEventListener("click", () => {
    triggerSlotFeedback(cell);
    openActivityModal(index);
  });

  return cell;
}

function renderGrid() {
  const currentSlotIndex = getCurrentSlotIndex();
  const promptSlotIndex = getPromptSlotIndex();

  trackerGrid.innerHTML = "";

  TIME_SECTIONS.forEach((section) => {
    const sectionElement = document.createElement("section");
    sectionElement.className = `time-section ${section.label.toLowerCase()}-section`;
    sectionElement.setAttribute("aria-label", `${section.label} tracker slots, ${section.detail}`);

    const sectionBody = document.createElement("div");
    sectionBody.className = "time-section-body";

    for (let index = section.start; index <= section.end; index += 1) {
      sectionBody.appendChild(createTimeCell(dayData[index], index, promptSlotIndex, currentSlotIndex));
    }

    sectionElement.append(sectionBody);
    trackerGrid.appendChild(sectionElement);
  });

  highlightFeedingGaps();
}

function syncModalState() {
  if (activeSlotIndex === null || !activeSlotDraft) {
    return;
  }

  modalDateLabel.textContent = formatFullDate(selectedDate);
  modalTitle.textContent = getSlotTime(activeSlotIndex);
  modalNotes.value = activeSlotDraft.notes;

  activityChoiceButtons.forEach((button) => {
    const type = button.dataset.type;
    button.setAttribute("aria-pressed", String(activeSlotDraft[type]));
  });
}

function openActivityModal(index) {
  activeSlotIndex = index;
  activeSlotDraft = copySlot(dayData[index]);
  syncModalState();
  activityModal.hidden = false;
  document.body.classList.add("modal-open");
  activityChoiceButtons[0]?.focus();
}

function closeActivityModal() {
  activityModal.hidden = true;
  document.body.classList.remove("modal-open");
  activeSlotIndex = null;
  activeSlotDraft = null;
}

function toggleActivity(type) {
  if (activeSlotIndex === null || !activeSlotDraft) {
    return;
  }

  activeSlotDraft[type] = !activeSlotDraft[type];
  syncModalState();
}

function updateModalNotes() {
  if (activeSlotIndex === null || !activeSlotDraft) {
    return;
  }

  activeSlotDraft.notes = modalNotes.value;
}

function saveActivityModal() {
  if (activeSlotIndex === null || !activeSlotDraft) {
    return;
  }

  dayData[activeSlotIndex] = copySlot(activeSlotDraft);
  saveDay();
  renderGrid();
  closeActivityModal();
}

function deleteActivityEntry() {
  if (activeSlotIndex === null) {
    return;
  }

  dayData[activeSlotIndex] = createEmptySlot();
  saveDay();
  renderGrid();
  closeActivityModal();
}

function updateFeedStatus() {
  const lastIndex = getLastMilkIndex();

  if (lastIndex === null) {
    lastMilkTime.textContent = "--";
    nextFeedTime.textContent = "--";
    return;
  }

  const nextWindow = getNextFeedWindow();
  const nextStart = nextWindow?.start ?? null;
  const nextEnd = nextWindow ? nextWindow.end + 1 : null;

  lastMilkTime.textContent = getSlotTime(lastIndex);
  nextFeedTime.textContent = nextStart === null ? "--" : getSlotRangeLabel(nextStart, nextEnd);

  if (!isToday(selectedDate)) {
    return;
  }
}

function updateSummary() {
  const milkCount = dayData.filter((slot) => slot.milk).length;

  milkTotal.textContent = milkCount;
  peeTotal.textContent = dayData.filter((slot) => slot.pee).length;
  poopTotal.textContent = dayData.filter((slot) => slot.poop).length;
  notesTotal.textContent = dayData.filter((slot) => slot.notes).length;
  updateFeedStatus();
}

function highlightFeedingGaps() {
  const cells = trackerGrid.querySelectorAll(".time-cell");
  cells.forEach((cell) => {
    cell.classList.remove("warning-gap", "next-feed-window");
  });

  const milkIndexes = getMilkIndexes();
  const warningRanges = [];

  for (let i = 0; i < milkIndexes.length - 1; i += 1) {
    const start = milkIndexes[i];
    const end = milkIndexes[i + 1];

    if (end - start > THREE_HOURS_IN_SLOTS) {
      warningRanges.push({ start: start + 1, end: end - 1 });
    }
  }

  if (milkIndexes.length > 0) {
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

  const nextFeedWindow = getNextFeedWindow();
  if (nextFeedWindow) {
    for (let index = nextFeedWindow.start; index <= nextFeedWindow.end; index += 1) {
      const cell = cells[index];

      if (cell) {
        cell.classList.add("next-feed-window");
        cell.setAttribute("aria-label", `${cell.getAttribute("aria-label")} Suggested next feeding window.`);
      }
    }
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

function openSettings() {
  window.alert("Settings are coming soon. Use the action buttons below the tracker to export or clear data.");
}

function updateStickyOffset() {
  const panelHeight = dailyPanel?.offsetHeight || 0;
  document.documentElement.style.setProperty("--section-sticky-top", `${panelHeight + 10}px`);
}

activityChoiceButtons.forEach((button) => {
  button.addEventListener("click", () => toggleActivity(button.dataset.type));
});

modalNotes.addEventListener("input", updateModalNotes);
saveEntryButton.addEventListener("click", saveActivityModal);
deleteEntryButton.addEventListener("click", deleteActivityEntry);
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
settingsButton.addEventListener("click", openSettings);
window.addEventListener("resize", updateStickyOffset);

loadDay();
