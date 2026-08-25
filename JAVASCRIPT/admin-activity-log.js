const SUPABASE_URL = "https://ocycijajjkqfsrcnpbmn.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_EDDbsmJyHARgnhGsQ_dcjA_HHItlr8T";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

let activityLog = [];

const adminName = document.getElementById("adminName");
const sidebarAdminName = document.getElementById("sidebarAdminName");
const adminAvatar = document.getElementById("adminAvatar");
const sidebarAdminAvatar = document.getElementById("sidebarAdminAvatar");

const logoutButton = document.getElementById("logoutButton");
const searchInput = document.getElementById("searchInput");
const dateFilter = document.getElementById("dateFilter");
const clearFilterButton = document.getElementById("clearFilterButton");
const clearHistoryButton = document.getElementById("clearHistoryButton");

const message = document.getElementById("message");
const resultCount = document.getElementById("resultCount");
const activityTableBody = document.getElementById("activityTableBody");
const emptyMessage = document.getElementById("emptyMessage");

function showMessage(text, type) {
  message.textContent = text;
  message.className = `message ${type}`;
}

function escapeHtml(value) {
  return String(value ?? "-")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getDateKey(dateValue) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateTime(dateValue) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return `
    <div class="date-time">
      <span>${date.toLocaleDateString()}</span>
      <small>${date.toLocaleTimeString()}</small>
    </div>
  `;
}

function displayActivity() {
  const searchText = searchInput.value.trim().toLowerCase();
  const selectedDate = dateFilter.value;

  const filteredActivity = activityLog.filter(function (log) {
    const searchableText = [
      log.user_name,
      log.user_role,
      log.activity,
      log.details
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch = searchableText.includes(searchText);

    const matchesDate =
      selectedDate === "" ||
      getDateKey(log.created_at) === selectedDate;

    return matchesSearch && matchesDate;
  });

  activityTableBody.innerHTML = "";

  resultCount.textContent =
    `${filteredActivity.length} activity record(s) found`;

  if (filteredActivity.length === 0) {
    emptyMessage.style.display = "block";
    return;
  }

  emptyMessage.style.display = "none";

  filteredActivity.forEach(function (log) {
    activityTableBody.innerHTML += `
      <tr>
        <td>${formatDateTime(log.created_at)}</td>
        <td>${escapeHtml(log.user_name)}</td>
        <td>${escapeHtml(log.user_role)}</td>
        <td>${escapeHtml(log.activity)}</td>
        <td>${escapeHtml(log.details)}</td>
      </tr>
    `;
  });
}

async function loadActivity() {
  const { data, error } = await supabaseClient.rpc(
    "admin_list_activity_logs"
  );

  if (error) {
    activityLog = [];
    displayActivity();

    showMessage(
      `Unable to load activity records: ${error.message}`,
      "error"
    );

    return;
  }

  activityLog = data || [];
  displayActivity();
}

async function clearAllHistory() {
  if (activityLog.length === 0) {
    showMessage("There is no activity history to clear.", "error");
    return;
  }

  const confirmed = confirm(
    "Clear ALL System Activity Log records?\n\nThis cannot be undone. Products, users, and stock history will not be affected."
  );

  if (!confirmed) {
    return;
  }

  clearHistoryButton.disabled = true;
  clearHistoryButton.textContent = "Clearing...";

  const { error } = await supabaseClient.rpc(
    "admin_clear_activity_logs"
  );

  clearHistoryButton.disabled = false;
  clearHistoryButton.textContent = "Clear All History";

  if (error) {
    showMessage(
      `Unable to clear activity history: ${error.message}`,
      "error"
    );

    return;
  }

  activityLog = [];
  displayActivity();

  showMessage(
    "All System Activity Log records were cleared.",
    "success"
  );
}

async function logout() {
  if (!confirm("Are you sure you want to logout?")) {
    return;
  }

  await supabaseClient.auth.signOut();
  localStorage.removeItem("currentUser");

  window.location.href = "login.html";
}

async function initialisePage() {
  const { data, error } = await supabaseClient.auth.getSession();

  if (error || !data.session) {
    window.location.href = "login.html";
    return;
  }

  const { data: profile, error: profileError } =
    await supabaseClient
      .from("profiles")
      .select("id, username, full_name, role, active")
      .eq("id", data.session.user.id)
      .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.active !== true ||
    profile.role !== "Admin"
  ) {
    await supabaseClient.auth.signOut();
    localStorage.removeItem("currentUser");
    window.location.href = "login.html";
    return;
  }

  const displayName = profile.full_name || profile.username || "Admin User";
  const initial = displayName.charAt(0).toUpperCase();

  adminName.textContent = displayName;
  sidebarAdminName.textContent = displayName;
  adminAvatar.textContent = initial;
  sidebarAdminAvatar.textContent = initial;

  localStorage.setItem(
    "currentUser",
    JSON.stringify({
      id: profile.id,
      username: profile.username,
      name: displayName,
      role: profile.role
    })
  );

  loadActivity();
}

searchInput.addEventListener("input", displayActivity);
dateFilter.addEventListener("change", displayActivity);

clearFilterButton.addEventListener("click", function () {
  searchInput.value = "";
  dateFilter.value = "";
  displayActivity();
});

clearHistoryButton.addEventListener("click", clearAllHistory);
logoutButton.addEventListener("click", logout);

initialisePage();