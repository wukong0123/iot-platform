const lockerGrid = document.getElementById("lockerGrid");
const historySelect = document.getElementById("historySelect");
const historyTableBody = document.getElementById("historyTableBody");
const refreshButton = document.getElementById("refreshButton");

function formatDoor(value) {
  return value === 1 ? "Open" : "Closed";
}

function formatPackage(value) {
  return value === 1 ? "Present" : "Empty";
}

function formatTime(value) {
  return new Date(value).toLocaleString();
}

function renderEmptyState(message) {
  lockerGrid.innerHTML = `<div class="empty-state">${message}</div>`;
}

function renderLockers(lockers) {
  if (lockers.length === 0) {
    renderEmptyState("No locker data yet. Start the simulator to publish MQTT messages.");
    return;
  }

  lockerGrid.innerHTML = lockers
    .map((locker) => {
      const hasAlerts = Array.isArray(locker.alerts) && locker.alerts.length > 0;
      const alerts = hasAlerts
        ? locker.alerts.map((alert) => `<span class="alert-pill">${alert}</span>`).join("")
        : '<span class="alert-pill">normal</span>';

      return `
        <article class="locker-card ${hasAlerts ? "alert" : ""}">
          <header>
            <h3>Locker ${locker.locker_id}</h3>
            <span class="status-chip ${hasAlerts ? "alert" : ""}">
              ${hasAlerts ? "Alert" : "Healthy"}
            </span>
          </header>
          <div class="metrics">
            <div class="metric-row"><span>Temperature</span><strong>${locker.temperature}C</strong></div>
            <div class="metric-row"><span>Door</span><strong>${formatDoor(locker.door)}</strong></div>
            <div class="metric-row"><span>Package</span><strong>${formatPackage(locker.has_package)}</strong></div>
            <div class="metric-row"><span>Updated</span><strong>${formatTime(locker.timestamp)}</strong></div>
          </div>
          <div class="alerts">${alerts}</div>
        </article>
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

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
}

async function loadHistory(lockerId) {
  const history = await fetchJson(`/history/${lockerId}?limit=10`);
  renderHistory(history);
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
    renderLockers(lockers);
    syncHistorySelect(lockers);

    if (lockers.length > 0) {
      const selectedLockerId = historySelect.value || String(lockers[0].locker_id);
      historySelect.value = selectedLockerId;
      await loadHistory(selectedLockerId);
    } else {
      historyTableBody.innerHTML =
        '<tr><td colspan="4">History will appear after the first MQTT messages arrive.</td></tr>';
    }
  } catch (error) {
    renderEmptyState(`Failed to load dashboard data: ${error.message}`);
    historyTableBody.innerHTML =
      '<tr><td colspan="4">Unable to fetch history while the backend is unavailable.</td></tr>';
  }
}

historySelect.addEventListener("change", async () => {
  if (!historySelect.value) {
    return;
  }

  try {
    await loadHistory(historySelect.value);
  } catch (error) {
    historyTableBody.innerHTML = `<tr><td colspan="4">${error.message}</td></tr>`;
  }
});

refreshButton.addEventListener("click", () => {
  refreshDashboard();
});

refreshDashboard();
setInterval(refreshDashboard, 5000);
