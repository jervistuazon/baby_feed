const APP_VERSION = "2026.06.15.5";
const FIREBASE_SDK_VERSION = window.ANYA_FIREBASE_SETTINGS?.sdkVersion || "12.14.0";
const TRACKER_PREFIX = "anya-tracker-";
const SLOT_MINUTES = 30;
const TOTAL_SLOTS = 48;
const DAY_MINUTES = 24 * 60;
const THREE_HOURS_IN_MINUTES = 3 * 60;
const FEED_WINDOW_DELAY_MINUTES = 2 * 60;
const FEED_WINDOW_DURATION_MINUTES = 60;
const ICONS = {
  milk: "bottle",
  pee: "drop",
  poop: "diaper",
  notes: "note"
};
const ACTIVITY_META = {
  milk: { icon: ICONS.milk, className: "milk-icon", label: "Milk", title: "Milk feed" },
  pee: { icon: ICONS.pee, className: "pee-icon", label: "Pee", title: "Pee" },
  poop: { icon: ICONS.poop, className: "poop-icon", label: "Poop", title: "Poop" },
  notes: { icon: ICONS.notes, className: "notes-icon", label: "Note", title: "Note" }
};

document.documentElement.dataset.appVersion = APP_VERSION;

const selectedDateText = document.getElementById("selectedDateText");
const dailyPanel = document.querySelector(".daily-panel");
const previousDayButton = document.getElementById("previousDay");
const todayButton = document.getElementById("todayButton");
const nextDayButton = document.getElementById("nextDay");
const trackerGrid = document.getElementById("trackerGrid");
const addEntryButton = document.getElementById("addEntryButton");
const milkTotal = document.getElementById("milkTotal");
const milkAverage = document.getElementById("milkAverage");
const peeTotal = document.getElementById("peeTotal");
const poopTotal = document.getElementById("poopTotal");
const notesTotal = document.getElementById("notesTotal");
const lastMilkTime = document.getElementById("lastMilkTime");
const nextFeedTime = document.getElementById("nextFeedTime");
const clearDayButton = document.getElementById("clearDay");
const exportCsvButton = document.getElementById("exportCsv");
const backupJsonButton = document.getElementById("backupJson");
const importJsonButton = document.getElementById("importJson");
const importJsonInput = document.getElementById("importJsonInput");
const syncStatus = document.getElementById("syncStatus");
const syncStatusText = document.getElementById("syncStatusText");
const signInGoogleButton = document.getElementById("signInGoogle");
const signOutGoogleButton = document.getElementById("signOutGoogle");
const settingsButton = document.getElementById("settingsButton");
const settingsMenu = document.getElementById("settingsMenu");
const activityModal = document.getElementById("activityModal");
const modalDateLabel = document.getElementById("modalDateLabel");
const modalTitle = document.getElementById("modalTitle");
const modalEntryTime = document.getElementById("modalEntryTime");
const closeModalButton = document.getElementById("closeModal");
const saveEntryButton = document.getElementById("saveEntry");
const deleteEntryButton = document.getElementById("deleteEntry");
const activityChoiceButtons = document.querySelectorAll(".activity-choice");
const modalMilkAmount = document.getElementById("modalMilkAmount");
const modalNotes = document.getElementById("modalNotes");

let selectedDate = new Date();
let dayData = [];
let activeEntryId = null;
let activeEntryDraft = null;
let firebaseAuth = null;
let firebaseUser = null;
let cloudUnsubscribe = null;

function createEmptySlot() {
  return {
    milk: false,
    milkAmountMl: null,
    pee: false,
    poop: false,
    notes: ""
  };
}

function createEntryId() {
  return `entry-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyEntry(timeMinutes = getCurrentTimeMinutes()) {
  return {
    id: createEntryId(),
    timeMinutes,
    milk: false,
    milkAmountMl: null,
    pee: false,
    poop: false,
    notes: ""
  };
}

function copySlot(slot) {
  return {
    milk: Boolean(slot?.milk),
    milkAmountMl: normalizeMilkAmount(slot?.milkAmountMl),
    pee: Boolean(slot?.pee),
    poop: Boolean(slot?.poop),
    notes: slot?.notes || ""
  };
}

function copyEntry(entry) {
  return {
    id: entry?.id || createEntryId(),
    timeMinutes: normalizeTimeMinutes(entry?.timeMinutes),
    milk: Boolean(entry?.milk),
    milkAmountMl: normalizeMilkAmount(entry?.milkAmountMl),
    pee: Boolean(entry?.pee),
    poop: Boolean(entry?.poop),
    notes: entry?.notes || ""
  };
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function normalizeMilkAmount(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return Math.round(amount);
}

function normalizeTimeMinutes(value) {
  const minutes = Number(value);

  if (!Number.isFinite(minutes)) {
    return 0;
  }

  return Math.min(DAY_MINUTES - 1, Math.max(0, Math.round(minutes)));
}

function getDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getStorageKey(date = selectedDate) {
  return `${TRACKER_PREFIX}${getDateKey(date)}`;
}

function getDateWithDayOffset(date, offset) {
  const shiftedDate = new Date(date);
  shiftedDate.setDate(shiftedDate.getDate() + offset);
  return shiftedDate;
}

function isTrackerStorageKey(key) {
  const match = String(key).match(/^anya-tracker-(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return false;
  }

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));

  return (
    date.getFullYear() === Number(year) &&
    date.getMonth() === Number(month) - 1 &&
    date.getDate() === Number(day)
  );
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

function getCurrentTimeMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function formatClockTime(timeMinutes) {
  const minutes = Number(timeMinutes);
  const roundedMinutes = Number.isFinite(minutes) ? Math.round(minutes) : 0;
  const minutesInDay = ((roundedMinutes % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
  const hours24 = Math.floor(minutesInDay / 60);
  const displayMinutes = minutesInDay % 60;
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;

  return `${hours12}:${pad(displayMinutes)} ${period}`;
}

function formatTimeRange(startMinutes, endMinutes) {
  return `${formatClockTime(startMinutes)}-${formatClockTime(endMinutes)}`;
}

function toTimeInputValue(timeMinutes) {
  const minutes = normalizeTimeMinutes(timeMinutes);
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

function fromTimeInputValue(value) {
  const match = String(value).match(/^(\d{2}):(\d{2})$/);

  if (!match) {
    return getCurrentTimeMinutes();
  }

  return normalizeTimeMinutes(Number(match[1]) * 60 + Number(match[2]));
}

function entryHasContent(entry) {
  return Boolean(entry?.milk || entry?.pee || entry?.poop || entry?.notes);
}

function compareEntries(a, b) {
  if (a.timeMinutes !== b.timeMinutes) {
    return a.timeMinutes - b.timeMinutes;
  }

  return String(a.id).localeCompare(String(b.id));
}

function getSortedEntries(entries = dayData) {
  return [...entries].sort(compareEntries);
}

function isLegacySlotDay(savedData) {
  return (
    Array.isArray(savedData) &&
    savedData.length === TOTAL_SLOTS &&
    savedData.every((item) => !item || typeof item !== "object" || !Object.prototype.hasOwnProperty.call(item, "timeMinutes"))
  );
}

function convertLegacySlotsToEntries(slots) {
  return slots
    .map((slot, index) => ({
      id: `slot-${pad(index)}`,
      timeMinutes: index * SLOT_MINUTES,
      ...copySlot(slot)
    }))
    .filter(entryHasContent);
}

function normalizeEntries(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  const usedIds = new Set();

  return entries
    .map((entry, index) => {
      const normalized = copyEntry(entry);

      if (usedIds.has(normalized.id)) {
        normalized.id = `${normalized.id}-${index}`;
      }

      usedIds.add(normalized.id);
      return normalized;
    })
    .filter(entryHasContent)
    .sort(compareEntries);
}

function normalizeLoadedDay(savedData) {
  if (!Array.isArray(savedData)) {
    return { entries: [], migrated: false };
  }

  if (isLegacySlotDay(savedData)) {
    return {
      entries: normalizeEntries(convertLegacySlotsToEntries(savedData)),
      migrated: true
    };
  }

  return {
    entries: normalizeEntries(savedData),
    migrated: false
  };
}

function createLocalTrackerStore() {
  return {
    loadDay(date) {
      const key = getStorageKey(date);
      const saved = localStorage.getItem(key);
      const normalized = normalizeLoadedDay(saved ? JSON.parse(saved) : null);

      if (normalized.migrated) {
        this.saveDay(date, normalized.entries);
      }

      return normalized.entries;
    },
    saveDay(date, entries) {
      const normalizedEntries = normalizeEntries(entries);
      const key = getStorageKey(date);

      if (normalizedEntries.length) {
        localStorage.setItem(key, JSON.stringify(normalizedEntries));
      } else {
        localStorage.removeItem(key);
      }

      return normalizedEntries;
    },
    clearDay(date) {
      localStorage.removeItem(getStorageKey(date));
    },
    hasDayKey(key) {
      return localStorage.getItem(key) !== null;
    },
    backupDays() {
      const backup = {};

      Object.keys(localStorage)
        .filter(isTrackerStorageKey)
        .sort()
        .forEach((key) => {
          try {
            const normalized = normalizeLoadedDay(JSON.parse(localStorage.getItem(key)));
            backup[key] = normalized.entries;
          } catch (error) {
            backup[key] = [];
          }
        });

      return backup;
    },
    importDays(days) {
      days.forEach(({ key, day }) => {
        const entries = normalizeEntries(day);

        if (entries.length) {
          localStorage.setItem(key, JSON.stringify(entries));
        } else {
          localStorage.removeItem(key);
        }
      });
    }
  };
}

function getDateKeyFromStorageKey(key) {
  return String(key).slice(TRACKER_PREFIX.length);
}

function isFirebaseConfigComplete(config) {
  return ["apiKey", "authDomain", "projectId", "storageBucket", "messagingSenderId", "appId"].every((key) =>
    Boolean(String(config?.[key] || "").trim())
  );
}

function getFirebaseModulesUrl(moduleName) {
  return `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/${moduleName}`;
}

function getFirebaseFamilyId() {
  const configuredFamilyId = String(window.ANYA_FIREBASE_SETTINGS?.familyId || "").trim();
  return configuredFamilyId || "anya-family";
}

function getCloudEntryData(entry, user, existingIds) {
  const data = {
    id: entry.id,
    timeMinutes: entry.timeMinutes,
    milk: entry.milk,
    milkAmountMl: entry.milkAmountMl,
    pee: entry.pee,
    poop: entry.poop,
    notes: entry.notes,
    updatedAt: user.modules.serverTimestamp(),
    updatedBy: user.authUser.uid
  };

  if (!existingIds.has(entry.id)) {
    data.createdAt = user.modules.serverTimestamp();
  }

  return data;
}

function getBackupDayCount(backup) {
  return Object.values(backup).filter((entries) => Array.isArray(entries) && entries.length).length;
}

function getBackupEntryCount(backup) {
  return Object.values(backup).reduce((total, entries) => total + (Array.isArray(entries) ? entries.length : 0), 0);
}

function getImportDaysFromBackup(backup) {
  return Object.entries(backup)
    .filter(([key]) => isTrackerStorageKey(key))
    .map(([key, day]) => ({ key, day: normalizeLoadedDay(day).entries }))
    .filter(({ day }) => day.length)
    .sort((a, b) => a.key.localeCompare(b.key));
}

async function loadFirebaseModules() {
  const [appModule, authModule, firestoreModule] = await Promise.all([
    import(getFirebaseModulesUrl("firebase-app.js")),
    import(getFirebaseModulesUrl("firebase-auth.js")),
    import(getFirebaseModulesUrl("firebase-firestore.js"))
  ]);

  return {
    initializeApp: appModule.initializeApp,
    getAuth: authModule.getAuth,
    GoogleAuthProvider: authModule.GoogleAuthProvider,
    onAuthStateChanged: authModule.onAuthStateChanged,
    signInWithPopup: authModule.signInWithPopup,
    signOut: authModule.signOut,
    getFirestore: firestoreModule.getFirestore,
    collection: firestoreModule.collection,
    deleteDoc: firestoreModule.deleteDoc,
    doc: firestoreModule.doc,
    getDoc: firestoreModule.getDoc,
    getDocs: firestoreModule.getDocs,
    onSnapshot: firestoreModule.onSnapshot,
    serverTimestamp: firestoreModule.serverTimestamp,
    setDoc: firestoreModule.setDoc,
    writeBatch: firestoreModule.writeBatch
  };
}

function createCloudTrackerStore(modules, db, authUser) {
  const familyId = getFirebaseFamilyId();
  const userContext = { modules, authUser };

  function familyRef() {
    return modules.doc(db, "families", familyId);
  }

  function memberRef(uid = authUser.uid) {
    return modules.doc(db, "families", familyId, "members", uid);
  }

  function dayRef(dateOrKey) {
    const dayKey = typeof dateOrKey === "string" ? dateOrKey : getDateKey(dateOrKey);
    return modules.doc(db, "families", familyId, "days", dayKey);
  }

  function entriesRef(dateOrKey) {
    const dayKey = typeof dateOrKey === "string" ? dateOrKey : getDateKey(dateOrKey);
    return modules.collection(db, "families", familyId, "days", dayKey, "entries");
  }

  async function ensureFamilyMembership() {
    const familySnapshot = await modules.getDoc(familyRef());

    if (!familySnapshot.exists()) {
      await modules.setDoc(familyRef(), {
        ownerUid: authUser.uid,
        createdAt: modules.serverTimestamp(),
        updatedAt: modules.serverTimestamp()
      });
    }

    const memberSnapshot = await modules.getDoc(memberRef());

    if (!memberSnapshot.exists()) {
      await modules.setDoc(memberRef(), {
        uid: authUser.uid,
        email: authUser.email || "",
        displayName: authUser.displayName || "",
        role: familySnapshot.exists() ? "caregiver" : "owner",
        createdAt: modules.serverTimestamp(),
        updatedAt: modules.serverTimestamp()
      });
    }
  }

  async function loadDayEntries(dateOrKey) {
    await ensureFamilyMembership();

    const snapshot = await modules.getDocs(entriesRef(dateOrKey));
    return normalizeLoadedDay(snapshot.docs.map((entryDoc) => ({ id: entryDoc.id, ...entryDoc.data() }))).entries;
  }

  return {
    isCloud: true,
    async loadDay(date) {
      return loadDayEntries(date);
    },
    async saveDay(date, entries) {
      await ensureFamilyMembership();

      const normalizedEntries = normalizeEntries(entries);
      const existingSnapshot = await modules.getDocs(entriesRef(date));
      const existingIds = new Set(existingSnapshot.docs.map((entryDoc) => entryDoc.id));
      const savedIds = new Set(normalizedEntries.map((entry) => entry.id));
      const batch = modules.writeBatch(db);

      batch.set(dayRef(date), {
        dateKey: getDateKey(date),
        updatedAt: modules.serverTimestamp(),
        updatedBy: authUser.uid
      }, { merge: true });

      normalizedEntries.forEach((entry) => {
        batch.set(
          modules.doc(db, "families", familyId, "days", getDateKey(date), "entries", entry.id),
          getCloudEntryData(entry, userContext, existingIds),
          { merge: true }
        );
      });

      existingSnapshot.docs.forEach((entryDoc) => {
        if (!savedIds.has(entryDoc.id)) {
          batch.delete(entryDoc.ref);
        }
      });

      await batch.commit();
      return normalizedEntries;
    },
    async clearDay(date) {
      await ensureFamilyMembership();

      const snapshot = await modules.getDocs(entriesRef(date));
      const batch = modules.writeBatch(db);

      snapshot.docs.forEach((entryDoc) => batch.delete(entryDoc.ref));
      batch.delete(dayRef(date));
      await batch.commit();
    },
    async hasDayKey(key) {
      if (!isTrackerStorageKey(key)) {
        return false;
      }

      await ensureFamilyMembership();
      const snapshot = await modules.getDoc(dayRef(getDateKeyFromStorageKey(key)));
      return snapshot.exists();
    },
    async backupDays() {
      await ensureFamilyMembership();

      const backup = {};
      const daysSnapshot = await modules.getDocs(modules.collection(db, "families", familyId, "days"));
      const sortedDayIds = daysSnapshot.docs
        .map((dayDoc) => dayDoc.id)
        .filter((dayId) => isTrackerStorageKey(`${TRACKER_PREFIX}${dayId}`))
        .sort();

      for (const dayId of sortedDayIds) {
        backup[`${TRACKER_PREFIX}${dayId}`] = await loadDayEntries(dayId);
      }

      return backup;
    },
    async importDays(days) {
      for (const { key, day } of days) {
        if (isTrackerStorageKey(key)) {
          await this.saveDay(new Date(`${getDateKeyFromStorageKey(key)}T00:00:00`), day);
        }
      }
    },
    subscribeDay(date, handleEntries, handleError) {
      const unsubscribe = modules.onSnapshot(
        entriesRef(date),
        (snapshot) => {
          const entries = normalizeLoadedDay(snapshot.docs.map((entryDoc) => ({ id: entryDoc.id, ...entryDoc.data() }))).entries;
          handleEntries(entries);
        },
        handleError
      );

      return unsubscribe;
    }
  };
}

const localTrackerStore = createLocalTrackerStore();
let trackerStore = localTrackerStore;

function updateSyncStatus(text, state = "local") {
  syncStatusText.textContent = text;
  syncStatus.classList.toggle("cloud-sync", state === "cloud");
  syncStatus.classList.toggle("cloud-error", state === "error");
  syncStatus.classList.toggle("local-sync", state === "local");
}

function updateAuthButtons() {
  const firebaseReady = isFirebaseConfigComplete(window.ANYA_FIREBASE_CONFIG);

  signInGoogleButton.hidden = Boolean(firebaseUser) || !firebaseReady;
  signOutGoogleButton.hidden = !firebaseUser;
}

function clearCloudSubscription() {
  if (typeof cloudUnsubscribe === "function") {
    cloudUnsubscribe();
    cloudUnsubscribe = null;
  }
}

function subscribeToSelectedDay(date) {
  clearCloudSubscription();

  if (!trackerStore.subscribeDay) {
    return;
  }

  const subscribedDateKey = getDateKey(date);

  cloudUnsubscribe = trackerStore.subscribeDay(
    date,
    (entries) => {
      if (getDateKey(selectedDate) !== subscribedDateKey) {
        return;
      }

      dayData = entries;
      renderTimeline();
      updateSummary();
    },
    () => {
      updateSyncStatus("Cloud error", "error");
    }
  );
}

async function loadDay() {
  const loadingDate = new Date(selectedDate);
  const loadingDateKey = getDateKey(loadingDate);

  try {
    dayData = await trackerStore.loadDay(loadingDate);
  } catch (error) {
    dayData = [];
    updateSyncStatus(trackerStore.isCloud ? "Cloud error" : "Local only", trackerStore.isCloud ? "error" : "local");
  }

  if (getDateKey(selectedDate) !== loadingDateKey) {
    return;
  }

  selectedDateText.textContent = isToday(selectedDate) ? "Today" : formatDisplayDate(selectedDate);
  updateStickyOffset();
  renderTimeline();
  updateSummary();
  subscribeToSelectedDay(loadingDate);
}

async function saveDay() {
  const savingDate = new Date(selectedDate);

  try {
    dayData = await trackerStore.saveDay(savingDate, dayData);
  } catch (error) {
    window.alert(trackerStore.isCloud ? "Couldn't save to cloud. Please check your connection and sign-in." : "Couldn't save this day.");
    return;
  }

  renderTimeline();
  updateSummary();
}

function getEntryActivities(entry) {
  const activities = [];

  if (entry.milk) {
    activities.push(ACTIVITY_META.milk);
  }

  if (entry.pee) {
    activities.push(ACTIVITY_META.pee);
  }

  if (entry.poop) {
    activities.push(ACTIVITY_META.poop);
  }

  if (entry.notes) {
    activities.push(ACTIVITY_META.notes);
  }

  return activities;
}

function getPrimaryActivity(entry) {
  if (entry.milk) {
    return ACTIVITY_META.milk;
  }

  if (entry.pee) {
    return ACTIVITY_META.pee;
  }

  if (entry.poop) {
    return ACTIVITY_META.poop;
  }

  return ACTIVITY_META.notes;
}

function getEntryTitle(entry) {
  return entry.notes || "";
}

function getEntrySummary(entry) {
  const labels = [];
  const amount = normalizeMilkAmount(entry.milkAmountMl);

  if (entry.milk) {
    labels.push(amount ? `feed ${amount} ml` : "feed");
  }

  if (entry.pee) {
    labels.push("pee");
  }

  if (entry.poop) {
    labels.push("poop");
  }

  if (entry.notes) {
    labels.push(`note: ${entry.notes}`);
  }

  return labels.join(", ");
}

function formatDuration(minutes) {
  const wholeMinutes = Math.max(0, Math.round(minutes));

  if (wholeMinutes < 2) {
    return "now";
  }

  if (wholeMinutes < 60) {
    return `${wholeMinutes} min`;
  }

  const hours = Math.floor(wholeMinutes / 60);
  const remainder = wholeMinutes % 60;

  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function getEntryProximityLabel(entry) {
  if (!isToday(selectedDate)) {
    return formatDisplayDate(selectedDate);
  }

  const difference = getCurrentTimeMinutes() - entry.timeMinutes;
  const label = formatDuration(Math.abs(difference));

  if (label === "now") {
    return "Just now";
  }

  return difference >= 0 ? `${label} ago` : `in ${label}`;
}

function getMilkEntries() {
  return getSortedEntries().filter((entry) => entry.milk);
}

async function loadEntriesForDate(date) {
  try {
    return await trackerStore.loadDay(date);
  } catch (error) {
    return [];
  }
}

async function getLastMilkEntryForDate(date, dayOffset) {
  const milkEntries = getSortedEntries(await loadEntriesForDate(date)).filter((entry) => entry.milk);
  const lastEntry = milkEntries[milkEntries.length - 1];

  return lastEntry ? { ...lastEntry, dayOffset } : null;
}

async function getLastMilkEntry() {
  const milkEntries = getMilkEntries();

  if (!milkEntries.length) {
    return getLastMilkEntryForDate(getDateWithDayOffset(selectedDate, -1), -1);
  }

  if (!isToday(selectedDate)) {
    return { ...milkEntries[milkEntries.length - 1], dayOffset: 0 };
  }

  const currentTime = getCurrentTimeMinutes();
  const currentDayEntry = [...milkEntries].reverse().find((entry) => entry.timeMinutes <= currentTime);

  if (currentDayEntry) {
    return { ...currentDayEntry, dayOffset: 0 };
  }

  return (await getLastMilkEntryForDate(getDateWithDayOffset(selectedDate, -1), -1)) ?? {
    ...milkEntries[milkEntries.length - 1],
    dayOffset: 0
  };
}

function formatLastMilkTime(entry) {
  if (!entry || entry.dayOffset === 0) {
    return entry ? formatClockTime(entry.timeMinutes) : "--";
  }

  const entryDate = getDateWithDayOffset(selectedDate, entry.dayOffset);
  const dateLabel = entry.dayOffset === -1 && isToday(selectedDate) ? "Yesterday" : formatDisplayDate(entryDate);
  return `${dateLabel} ${formatClockTime(entry.timeMinutes)}`;
}

async function getNextFeedWindow() {
  const anchorEntry = await getLastMilkEntry();

  if (!anchorEntry) {
    return null;
  }

  const anchorTime = anchorEntry.timeMinutes + (anchorEntry.dayOffset || 0) * DAY_MINUTES;
  const start = anchorTime + FEED_WINDOW_DELAY_MINUTES;
  const end = start + FEED_WINDOW_DURATION_MINUTES;

  if (end <= 0) {
    return null;
  }

  return {
    anchorEntry,
    start,
    end
  };
}

function triggerEntryFeedback(row) {
  row.classList.remove("entry-tapped");
  window.requestAnimationFrame(() => {
    row.classList.add("entry-tapped");
    window.setTimeout(() => row.classList.remove("entry-tapped"), 260);
  });
}

function createSvgIcon(name, className) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");

  svg.classList.add(...className.split(" "));
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  use.setAttribute("href", `#icon-${name}`);
  svg.appendChild(use);

  return svg;
}

function createActivityBadge(activity) {
  const badge = document.createElement("span");
  badge.className = `activity-badge ${activity.className}`;
  badge.setAttribute("aria-hidden", "true");
  badge.appendChild(createSvgIcon(activity.icon, "activity-icon-pill"));
  return badge;
}

function createEntryRow(entry) {
  const row = document.createElement("button");
  const activities = getEntryActivities(entry);
  const primaryActivity = getPrimaryActivity(entry);
  const milkAmount = normalizeMilkAmount(entry.milkAmountMl);

  row.type = "button";
  row.className = `timeline-entry ${primaryActivity.className.replace("-icon", "-entry")}`;
  row.dataset.entryId = entry.id;
  row.setAttribute("aria-label", `${formatClockTime(entry.timeMinutes)}: ${getEntrySummary(entry)}. Tap to edit.`);

  const timeBlock = document.createElement("span");
  timeBlock.className = "entry-time";

  const timeText = document.createElement("strong");
  timeText.textContent = formatClockTime(entry.timeMinutes);

  const proximity = document.createElement("small");
  proximity.textContent = getEntryProximityLabel(entry);

  timeBlock.append(timeText, proximity);

  const iconStrip = document.createElement("span");
  iconStrip.className = "entry-icons";
  activities.forEach((activity) => iconStrip.appendChild(createActivityBadge(activity)));

  const content = document.createElement("span");
  content.className = "entry-content";

  const title = document.createElement("span");
  title.textContent = getEntryTitle(entry);

  if (title.textContent) {
    content.append(title);
  }

  const meta = document.createElement("span");
  meta.className = "entry-meta";

  if (entry.milk && milkAmount) {
    const amount = document.createElement("strong");
    amount.textContent = `${milkAmount} ml`;
    meta.appendChild(amount);
  }

  meta.appendChild(createSvgIcon("chevron", "entry-chevron"));

  row.append(timeBlock, iconStrip, content, meta);
  row.addEventListener("click", () => {
    triggerEntryFeedback(row);
    openActivityModal(entry.id);
  });

  return row;
}

function createEmptyTimeline() {
  const emptyState = document.createElement("button");
  emptyState.type = "button";
  emptyState.className = "empty-timeline";
  emptyState.setAttribute("aria-label", "Add the first entry for this day");

  const icon = document.createElement("span");
  icon.className = "empty-timeline-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.appendChild(createSvgIcon("plus", "app-icon"));

  const text = document.createElement("div");
  const title = document.createElement("strong");
  const detail = document.createElement("span");

  title.textContent = "No entries yet";
  detail.textContent = "Add the first entry for this day.";
  text.append(title, detail);
  emptyState.append(icon, text);
  emptyState.addEventListener("click", openNewEntryModal);
  return emptyState;
}

function renderTimeline() {
  const entries = getSortedEntries();

  trackerGrid.innerHTML = "";

  if (!entries.length) {
    trackerGrid.appendChild(createEmptyTimeline());
    return;
  }

  entries.forEach((entry) => {
    trackerGrid.appendChild(createEntryRow(entry));
  });

  window.requestAnimationFrame(() => {
    trackerGrid.scrollTop = trackerGrid.scrollHeight;
  });
}

function syncModalState() {
  if (!activeEntryDraft) {
    return;
  }

  modalDateLabel.textContent = formatFullDate(selectedDate);
  modalTitle.textContent = activeEntryId ? "Edit entry" : "New entry";
  modalEntryTime.value = toTimeInputValue(activeEntryDraft.timeMinutes);
  modalMilkAmount.value = activeEntryDraft.milkAmountMl ?? "";
  modalNotes.value = activeEntryDraft.notes;
  deleteEntryButton.textContent = activeEntryId ? "Delete entry" : "Discard";

  activityChoiceButtons.forEach((button) => {
    const type = button.dataset.type;
    button.setAttribute("aria-pressed", String(activeEntryDraft[type]));
  });
}

function openActivityModal(entryId) {
  const entry = dayData.find((item) => item.id === entryId);

  if (!entry) {
    return;
  }

  activeEntryId = entryId;
  activeEntryDraft = copyEntry(entry);
  syncModalState();
  activityModal.hidden = false;
  document.body.classList.add("modal-open");
  activityChoiceButtons[0]?.focus();
}

function openNewEntryModal() {
  activeEntryId = null;
  activeEntryDraft = createEmptyEntry(getCurrentTimeMinutes());
  syncModalState();
  activityModal.hidden = false;
  document.body.classList.add("modal-open");
  activityChoiceButtons[0]?.focus();
}

function closeActivityModal() {
  activityModal.hidden = true;
  document.body.classList.remove("modal-open");
  activeEntryId = null;
  activeEntryDraft = null;
}

function toggleActivity(type) {
  if (!activeEntryDraft) {
    return;
  }

  activeEntryDraft[type] = !activeEntryDraft[type];

  if (type === "milk" && !activeEntryDraft.milk) {
    activeEntryDraft.milkAmountMl = null;
  }

  syncModalState();
}

function updateModalTime() {
  if (!activeEntryDraft) {
    return;
  }

  activeEntryDraft.timeMinutes = fromTimeInputValue(modalEntryTime.value);
}

function updateModalMilkAmount() {
  if (!activeEntryDraft) {
    return;
  }

  activeEntryDraft.milkAmountMl = normalizeMilkAmount(modalMilkAmount.value);

  if (activeEntryDraft.milkAmountMl !== null) {
    activeEntryDraft.milk = true;
  }

  syncModalState();
}

function updateModalNotes() {
  if (!activeEntryDraft) {
    return;
  }

  activeEntryDraft.notes = modalNotes.value;
}

async function saveActivityModal() {
  if (!activeEntryDraft) {
    return;
  }

  if (!activeEntryDraft.milk) {
    activeEntryDraft.milkAmountMl = null;
  }

  const entry = copyEntry(activeEntryDraft);
  entry.notes = entry.notes.trim();

  if (!entryHasContent(entry)) {
    window.alert("Choose at least one activity or add a note.");
    return;
  }

  if (activeEntryId) {
    dayData = dayData.map((item) => (item.id === activeEntryId ? entry : item));
  } else {
    dayData = [...dayData, entry];
  }

  await saveDay();
  closeActivityModal();
}

async function deleteActivityEntry() {
  if (activeEntryId) {
    dayData = dayData.filter((entry) => entry.id !== activeEntryId);
    await saveDay();
  }

  closeActivityModal();
}

async function updateFeedStatus() {
  const statusDateKey = getDateKey(selectedDate);
  const lastEntry = await getLastMilkEntry();

  if (statusDateKey !== getDateKey(selectedDate)) {
    return;
  }

  if (!lastEntry) {
    lastMilkTime.textContent = "--";
    nextFeedTime.textContent = "--";
    return;
  }

  const nextWindow = await getNextFeedWindow();

  lastMilkTime.textContent = formatLastMilkTime(lastEntry);
  nextFeedTime.textContent = nextWindow ? formatTimeRange(nextWindow.start, nextWindow.end) : "--";
}

function updateSummary() {
  const milkEntries = dayData.filter((entry) => entry.milk);
  const milkCount = milkEntries.length;
  const totalMilkMl = milkEntries.reduce((total, entry) => total + (normalizeMilkAmount(entry.milkAmountMl) || 0), 0);
  const averageMilkMl = milkCount ? Math.round(totalMilkMl / milkCount) : null;

  milkTotal.textContent = `${totalMilkMl} ml`;
  milkAverage.textContent = `${milkCount} ${milkCount === 1 ? "feed" : "feeds"}\navg ${
    averageMilkMl === null ? "--" : `${averageMilkMl} ml`
  }`;
  peeTotal.textContent = dayData.filter((entry) => entry.pee).length;
  poopTotal.textContent = dayData.filter((entry) => entry.poop).length;
  notesTotal.textContent = dayData.filter((entry) => entry.notes).length;
  updateFeedStatus().catch(() => {
    lastMilkTime.textContent = "--";
    nextFeedTime.textContent = "--";
  });
}

function changeDay(offset) {
  selectedDate.setDate(selectedDate.getDate() + offset);
  loadDay();
}

function goToToday() {
  selectedDate = new Date();
  loadDay();
}

async function clearDay() {
  const dateText = formatDisplayDate(selectedDate);
  const destinationText = trackerStore.isCloud ? " from cloud" : "";
  const confirmed = window.confirm(`Clear all tracker entries for ${dateText}${destinationText}?`);

  if (!confirmed) {
    return;
  }

  try {
    await trackerStore.clearDay(selectedDate);
    dayData = [];
  } catch (error) {
    window.alert(trackerStore.isCloud ? "Couldn't clear this cloud day." : "Couldn't clear this day.");
    return;
  }

  renderTimeline();
  updateSummary();
}

function closeSettingsMenu() {
  settingsMenu.hidden = true;
  settingsButton.setAttribute("aria-expanded", "false");
}

function toggleSettingsMenu() {
  const isOpening = settingsMenu.hidden;

  settingsMenu.hidden = !isOpening;
  settingsButton.setAttribute("aria-expanded", String(isOpening));
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
  const rows = ["Date,Time,Milk,Milk ML,Pee,Poop,Notes"];
  const dateKey = getDateKey(selectedDate);

  getSortedEntries().forEach((entry) => {
    rows.push([
      dateKey,
      formatClockTime(entry.timeMinutes),
      entry.milk ? "Yes" : "No",
      entry.milk ? normalizeMilkAmount(entry.milkAmountMl) || "" : "",
      entry.pee ? "Yes" : "No",
      entry.poop ? "Yes" : "No",
      entry.notes
    ].map(escapeCsv).join(","));
  });

  downloadFile(`anya-tracker-${dateKey}.csv`, rows.join("\n"), "text/csv;charset=utf-8");
}

async function backupJson() {
  const backup = await trackerStore.backupDays();

  downloadFile(
    `anya-tracker-backup-${getDateKey(new Date())}.json`,
    JSON.stringify(backup, null, 2),
    "application/json;charset=utf-8"
  );
}

function parseBackupDay(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch (error) {
    return null;
  }
}

function getImportableTrackerEntries(backup) {
  if (!backup || typeof backup !== "object" || Array.isArray(backup)) {
    throw new Error("Invalid backup format");
  }

  return Object.entries(backup)
    .filter(([key]) => isTrackerStorageKey(key))
    .map(([key, value]) => {
      const day = parseBackupDay(value);
      return day ? { key, day: normalizeLoadedDay(day).entries } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.key.localeCompare(b.key));
}

function importJsonFile(file) {
  if (!file) {
    return;
  }

  const reader = new FileReader();

  reader.addEventListener("load", async () => {
    try {
      const backup = JSON.parse(reader.result);
      const entries = getImportableTrackerEntries(backup);

      if (!entries.length) {
        window.alert("No saved Baby Tracker days were found in that file.");
        return;
      }

      const replacedStatuses = await Promise.all(entries.map(({ key }) => trackerStore.hasDayKey(key)));
      const replacedCount = replacedStatuses.filter(Boolean).length;
      const dayText = `${entries.length} saved ${entries.length === 1 ? "day" : "days"}`;
      const destinationText = trackerStore.isCloud ? " to cloud" : "";
      const replaceText = replacedCount
        ? ` ${replacedCount} existing ${replacedCount === 1 ? "day" : "days"} will be replaced.`
        : "";
      const confirmed = window.confirm(`Import ${dayText}${destinationText}?${replaceText}`);

      if (!confirmed) {
        return;
      }

      await trackerStore.importDays(entries);
      loadDay();
      window.alert(`Imported ${dayText}.`);
    } catch (error) {
      window.alert("Couldn't import that file. Please choose a Baby Tracker JSON backup.");
    } finally {
      importJsonInput.value = "";
    }
  });

  reader.addEventListener("error", () => {
    window.alert("Couldn't read that file. Please try again.");
    importJsonInput.value = "";
  });

  reader.readAsText(file);
}

function importJson() {
  importJsonInput.click();
}

async function signInWithGoogle() {
  if (!firebaseAuth?.modules) {
    updateSyncStatus("Config needed", "error");
    return;
  }

  try {
    const provider = new firebaseAuth.modules.GoogleAuthProvider();
    await firebaseAuth.modules.signInWithPopup(firebaseAuth.auth, provider);
  } catch (error) {
    updateSyncStatus("Sign-in failed", "error");
  }
}

async function signOutGoogle() {
  if (!firebaseAuth?.modules) {
    return;
  }

  try {
    await firebaseAuth.modules.signOut(firebaseAuth.auth);
  } catch (error) {
    updateSyncStatus("Sign-out failed", "error");
  }
}

async function offerLocalBackupImportToCloud(cloudStore) {
  const localBackup = localTrackerStore.backupDays();
  const localDayCount = getBackupDayCount(localBackup);

  if (!localDayCount) {
    return;
  }

  let cloudBackup = {};

  try {
    cloudBackup = await cloudStore.backupDays();
  } catch (error) {
    return;
  }

  if (getBackupDayCount(cloudBackup)) {
    return;
  }

  const localEntryCount = getBackupEntryCount(localBackup);
  const confirmed = window.confirm(
    `Copy ${localEntryCount} local ${localEntryCount === 1 ? "entry" : "entries"} from ${localDayCount} ${localDayCount === 1 ? "day" : "days"} to cloud sync?`
  );

  if (!confirmed) {
    return;
  }

  try {
    updateSyncStatus("Syncing local data", "cloud");
    await cloudStore.importDays(getImportDaysFromBackup(localBackup));
    updateSyncStatus("Cloud sync", "cloud");
  } catch (error) {
    updateSyncStatus("Cloud import failed", "error");
    window.alert("Couldn't copy local tracker data to cloud. You can still use Backup and Import from Settings.");
  }
}

async function initializeFirebase() {
  const firebaseConfig = window.ANYA_FIREBASE_CONFIG;

  if (!isFirebaseConfigComplete(firebaseConfig)) {
    trackerStore = localTrackerStore;
    updateSyncStatus("Local only", "local");
    updateAuthButtons();
    return;
  }

  try {
    const modules = await loadFirebaseModules();
    const app = modules.initializeApp(firebaseConfig);
    const auth = modules.getAuth(app);
    const db = modules.getFirestore(app);

    firebaseAuth = { auth, db, modules };
    updateSyncStatus("Sign in", "local");
    updateAuthButtons();

    modules.onAuthStateChanged(auth, async (user) => {
      firebaseUser = user;

      if (!user) {
        trackerStore = localTrackerStore;
        clearCloudSubscription();
        updateSyncStatus("Local only", "local");
        updateAuthButtons();
        loadDay();
        return;
      }

      const cloudStore = createCloudTrackerStore(modules, db, user);
      await offerLocalBackupImportToCloud(cloudStore);
      trackerStore = cloudStore;
      updateSyncStatus("Cloud sync", "cloud");
      updateAuthButtons();
      loadDay();
    });
  } catch (error) {
    trackerStore = localTrackerStore;
    updateSyncStatus("Cloud setup failed", "error");
    updateAuthButtons();
  }
}

function updateStickyOffset() {
  const panelHeight = dailyPanel?.offsetHeight || 0;
  document.documentElement.style.setProperty("--section-sticky-top", `${panelHeight + 10}px`);
}

activityChoiceButtons.forEach((button) => {
  button.addEventListener("click", () => toggleActivity(button.dataset.type));
});

addEntryButton.addEventListener("click", openNewEntryModal);
modalEntryTime.addEventListener("input", updateModalTime);
modalMilkAmount.addEventListener("input", updateModalMilkAmount);
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
  if (event.key !== "Escape") {
    return;
  }

  if (!activityModal.hidden) {
    closeActivityModal();
  }

  if (!settingsMenu.hidden) {
    closeSettingsMenu();
  }
});

document.addEventListener("click", (event) => {
  if (settingsMenu.hidden) {
    return;
  }

  if (settingsMenu.contains(event.target) || settingsButton.contains(event.target)) {
    return;
  }

  closeSettingsMenu();
});

previousDayButton.addEventListener("click", () => changeDay(-1));
todayButton.addEventListener("click", goToToday);
nextDayButton.addEventListener("click", () => changeDay(1));
clearDayButton.addEventListener("click", () => {
  closeSettingsMenu();
  clearDay();
});
exportCsvButton.addEventListener("click", () => {
  closeSettingsMenu();
  exportCsv();
});
backupJsonButton.addEventListener("click", () => {
  closeSettingsMenu();
  backupJson().catch(() => {
    window.alert(trackerStore.isCloud ? "Couldn't back up cloud days." : "Couldn't back up saved days.");
  });
});
importJsonButton.addEventListener("click", () => {
  closeSettingsMenu();
  importJson();
});
signInGoogleButton.addEventListener("click", () => {
  closeSettingsMenu();
  signInWithGoogle();
});
signOutGoogleButton.addEventListener("click", () => {
  closeSettingsMenu();
  signOutGoogle();
});
importJsonInput.addEventListener("change", (event) => {
  importJsonFile(event.target.files?.[0]);
});
settingsButton.addEventListener("click", toggleSettingsMenu);
window.addEventListener("resize", updateStickyOffset);

loadDay();
initializeFirebase();
