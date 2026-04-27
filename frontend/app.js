const overviewStats = document.getElementById("overviewStats");
const lockerGrid = document.getElementById("lockerGrid");
const historySelect = document.getElementById("historySelect");
const historyTableBody = document.getElementById("historyTableBody");
const refreshButton = document.getElementById("refreshButton");
const selectedLockerTitle = document.getElementById("selectedLockerTitle");
const selectedLockerMeta = document.getElementById("selectedLockerMeta");
const selectedLockerAlerts = document.getElementById("selectedLockerAlerts");
const selectedLockerStats = document.getElementById("selectedLockerStats");
const chartArea = document.getElementById("chartArea");
const lastUpdatedLabel = document.getElementById("lastUpdatedLabel");

const state = {
  lockers: [],
  selectedLockerId: null
};

function formatDoor(value) {
  return value === 1 ? "Open" : "Closed";
}

function formatPackage(value) {
  return value === 1 ? "Present" : "Empty";
}

function formatTime(value) {
  return new Date(value).toLocaleString();
}

function computeOverview(lockers) {
  const total = lockers.length;
  const alerting = lockers.filter((locker) => Array.isArray(locker.alerts) && locker.alerts.length > 0)
    .length;
  const averageTemp = total
    ? (lockers.reduce((sum, locker) => sum + locker.temperature, 0) / total).toFixed(1)
    : "0.0";
  const packagesWaiting = lockers.filter((locker) => locker.has_package === 1).length;

  return [
    {
      label: "Connected lockers",
      value: String(total),
      detail: total ? "Receiving latest telemetry samples" : "No telemetry yet"
    },
    {
      label: "Alerting units",
      value: String(alerting),
      detail: alerting ? "Requires operational review" : "No active incidents"
    },
    {
      label: "Average temperature",
      value: `${averageTemp}C`,
      detail: "Across latest locker states"
    },
    {
      label: "Packages waiting",
      value: String(packagesWaiting),
      detail: "Lockers currently holding deliveries"
    }
  ];
}

function renderOverview(lockers) {
  const cards = computeOverview(lockers);
  overviewStats.innerHTML = cards
    .map(
      (card) => `
        <article class="overview-card">
          <p>${card.label}</p>
          <strong>${card.value}</strong>
          <span>${card.detail}</span>
        </article>
      `
    )
    .join("");
}

function renderEmptyState(message) {
  lockerGrid.innerHTML = `<div class="empty-state">${message}</div>`;
  chartArea.innerHTML = '<div class="empty-state">Historical chart will appear after data arrives.</div>';
  selectedLockerTitle.textContent = "Locker focus";
  selectedLockerMeta.textContent = message;
  selectedLockerAlerts.innerHTML = "";
  selectedLockerStats.innerHTML = "";
}

function renderLockers(lockers) {
  if (lockers.length === 0) {
    renderEmptyState("No locker data yet. Start the simulator to publish MQTT messages.");
    return;
  }

  lockerGrid.innerHTML = lockers
    .map((locker) => {
      const hasAlerts = Array.isArray(locker.alerts) && locker.alerts.length > 0;
      const isActive = locker.locker_id === state.selectedLockerId;

      return `
        <button
          type="button"
          class="locker-card ${hasAlerts ? "alert" : ""} ${isActive ? "active" : ""}"
          data-locker-id="${locker.locker_id}"
        >
          <div class="locker-head">
            <div>
              <h3>Locker ${locker.locker_id}</h3>
              <span class="metric-badge">${formatTime(locker.timestamp)}</span>
            </div>
            <span class="status-badge ${hasAlerts ? "alert" : ""}">
              ${hasAlerts ? "Attention" : "Healthy"}
            </span>
          </div>
          <dl>
            <div>
              <dt>Temperature</dt>
              <dd>${locker.temperature}C</dd>
            </div>
            <div>
              <dt>Door</dt>
              <dd>${formatDoor(locker.door)}</dd>
            </div>
            <div>
              <dt>Package</dt>
              <dd>${formatPackage(locker.has_package)}</dd>
            </div>
            <div>
              <dt>Alerts</dt>
              <dd>${hasAlerts ? locker.alerts.length : 0}</dd>
            </div>
          </dl>
        </button>
      `;
    })
    .join("");
}

function renderHistory(history) {
  if (history.length === 0) {
    historyTableBody.innerHTML =
      '<tr><td colspan="4">No history available for this locker yet.</td></tr>';
    return;
  }

  historyTableBody.innerHTML = history
    .map(
      (entry) => `
        <tr>
          <td>${formatTime(entry.timestamp)}</td>
          <td>${entry.temperature}C</td>
          <td>${formatDoor(entry.door)}</td>
          <td>${formatPackage(entry.has_package)}</td>
        </tr>
      `
    )
    .join("");
}

function renderSelectedLocker(locker) {
  if (!locker) {
    selectedLockerTitle.textContent = "Locker focus";
    selectedLockerMeta.textContent = "Select a locker to inspect its latest status and telemetry history.";
    selectedLockerAlerts.innerHTML = "";
    selectedLockerStats.innerHTML = "";
    chartArea.innerHTML = '<div class="empty-state">Historical chart will appear after data arrives.</div>';
    return;
  }

  selectedLockerTitle.textContent = `Locker ${locker.locker_id}`;
  selectedLockerMeta.textContent =
    `Latest sample received at ${formatTime(locker.timestamp)}. Current operational state and recent history are shown here.`;

  const alerts = Array.isArray(locker.alerts) && locker.alerts.length > 0 ? locker.alerts : ["normal"];
  selectedLockerAlerts.innerHTML = alerts
    .map((alert) => `<span class="alert-pill">${alert}</span>`)
    .join("");

  selectedLockerStats.innerHTML = [
    { label: "Temperature", value: `${locker.temperature}C` },
    { label: "Door state", value: formatDoor(locker.door) },
    { label: "Package status", value: formatPackage(locker.has_package) },
    { label: "Last warning", value: locker.last_warning || "No warning logged" }
  ]
    .map(
      (item) => `
        <div class="focus-stat">
          <span>${item.label}</span>
          <strong>${item.value}</strong>
        </div>
      `
    )
    .join("");

  chartArea.innerHTML =
    '<div class="empty-state">Historical chart is being added in the next update. Current data and event timeline are already live.</div>';
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
}

async function loadHistory(lockerId) {
  const history = await fetchJson(`/history/${lockerId}?limit=12`);
  renderHistory(history);
  return history;
}

function syncHistorySelect(lockers) {
  const currentValue = historySelect.value;
  historySelect.innerHTML = lockers
    .map((locker) => `<option value="${locker.locker_id}">Locker ${locker.locker_id}</option>`)
    .join("");

  if (currentValue && lockers.some((locker) => String(locker.locker_id) === currentValue)) {
    historySelect.value = currentValue;
  }
}

async function refreshDashboard() {
  try {
    const lockers = await fetchJson("/lockers");
    state.lockers = lockers;

    if (!state.selectedLockerId && lockers.length > 0) {
      state.selectedLockerId = lockers[0].locker_id;
    }

    if (
      state.selectedLockerId &&
      !lockers.some((locker) => locker.locker_id === state.selectedLockerId)
    ) {
      state.selectedLockerId = lockers.length > 0 ? lockers[0].locker_id : null;
    }

    renderOverview(lockers);
    syncHistorySelect(lockers);

    if (state.selectedLockerId) {
      historySelect.value = String(state.selectedLockerId);
    }

    renderLockers(lockers);

    if (lockers.length > 0) {
      const selectedLocker = lockers.find((locker) => locker.locker_id === state.selectedLockerId);
      renderSelectedLocker(selectedLocker);
      await loadHistory(state.selectedLockerId);
      lastUpdatedLabel.textContent = `Last sync ${new Date().toLocaleTimeString()}`;
    } else {
      historyTableBody.innerHTML =
        '<tr><td colspan="4">History will appear after the first MQTT messages arrive.</td></tr>';
      lastUpdatedLabel.textContent = "Awaiting first update";
    }
  } catch (error) {
    overviewStats.innerHTML = "";
    renderEmptyState(`Failed to load dashboard data: ${error.message}`);
    historyTableBody.innerHTML =
      '<tr><td colspan="4">Unable to fetch history while the backend is unavailable.</td></tr>';
    lastUpdatedLabel.textContent = "Backend unavailable";
  }
}

lockerGrid.addEventListener("click", async (event) => {
  const card = event.target.closest("[data-locker-id]");
  if (!card) {
    return;
  }

  state.selectedLockerId = Number(card.dataset.lockerId);
  historySelect.value = String(state.selectedLockerId);
  renderLockers(state.lockers);
  renderSelectedLocker(state.lockers.find((locker) => locker.locker_id === state.selectedLockerId));

  try {
    await loadHistory(state.selectedLockerId);
  } catch (error) {
    historyTableBody.innerHTML = `<tr><td colspan="4">${error.message}</td></tr>`;
  }
});

historySelect.addEventListener("change", async () => {
  if (!historySelect.value) {
    return;
  }

  state.selectedLockerId = Number(historySelect.value);
  renderLockers(state.lockers);
  renderSelectedLocker(state.lockers.find((locker) => locker.locker_id === state.selectedLockerId));

  try {
    await loadHistory(state.selectedLockerId);
  } catch (error) {
    historyTableBody.innerHTML = `<tr><td colspan="4">${error.message}</td></tr>`;
  }
});

refreshButton.addEventListener("click", () => {
  refreshDashboard();
});

refreshDashboard();
setInterval(refreshDashboard, 5000);
