const SUPABASE_URL = "https://ocycijajjkqfsrcnpbmn.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_EDDbsmJyHARgnhGsQ_dcjA_HHItlr8T";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

let currentUser = null;
let stockHistory = [];

const staffName = document.getElementById("staffName");
const sidebarStaffName =
  document.getElementById("sidebarStaffName");

const staffAvatar = document.getElementById("staffAvatar");
const sidebarStaffAvatar =
  document.getElementById("sidebarStaffAvatar");

const logoutButton = document.getElementById("logoutButton");

const searchInput = document.getElementById("searchInput");
const dateFilter = document.getElementById("dateFilter");
const monthFilter = document.getElementById("monthFilter");
const yearFilter = document.getElementById("yearFilter");
const typeFilter = document.getElementById("typeFilter");

const clearFilterButton =
  document.getElementById("clearFilterButton");

const historyTableBody =
  document.getElementById("historyTableBody");

const resultCount = document.getElementById("resultCount");
const emptyMessage = document.getElementById("emptyMessage");

function escapeHtml(value) {
  return String(value ?? "-")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getTransactionDate(dateValue) {
  return new Date(dateValue);
}

function getDateKey(dateValue) {
  const date = getTransactionDate(dateValue);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateTime(dateValue) {
  const date = getTransactionDate(dateValue);

  if (Number.isNaN(date.getTime())) {
    return `<div class="date-time"><span>-</span></div>`;
  }

  return `
    <div class="date-time">
      <span>${date.toLocaleDateString()}</span>
      <small>${date.toLocaleTimeString()}</small>
    </div>
  `;
}

function getTransactionStyle(transactionType, transaction) {
  if (transactionType === "Add Item") {
    return { className: "add-item", quantitySign: "+" };
  }

  if (transactionType === "Stock In") {
    return { className: "stock-in", quantitySign: "+" };
  }

  if (transactionType === "Stock Adjustment") {
    const isIncrease =
      Number(transaction.new_stock) >
      Number(transaction.previous_stock);

    return {
      className: "stock-adjustment",
      quantitySign: isIncrease ? "+" : "-"
    };
  }

  return { className: "stock-out", quantitySign: "-" };
}

function populateYears() {
  const currentValue = yearFilter.value;

  yearFilter.innerHTML = `<option value="All">All Years</option>`;

  const years = [];

  stockHistory.forEach(function (transaction) {
    const date = getTransactionDate(transaction.created_at);

    if (
      !Number.isNaN(date.getTime()) &&
      !years.includes(date.getFullYear())
    ) {
      years.push(date.getFullYear());
    }
  });

  years
    .sort(function (first, second) {
      return second - first;
    })
    .forEach(function (year) {
      yearFilter.innerHTML += `
        <option value="${year}">${year}</option>
      `;
    });

  if (currentValue && currentValue !== "All") {
    yearFilter.value = currentValue;
  }
}

function displayHistory() {
  const searchText = searchInput.value.trim().toLowerCase();
  const selectedDate = dateFilter.value;
  const selectedMonth = monthFilter.value;
  const selectedYear = yearFilter.value;
  const selectedType = typeFilter.value;

  const filteredHistory = stockHistory.filter(function (transaction) {
    const productName =
      String(transaction.product_name || "").toLowerCase();

    const barcode =
      String(transaction.barcode || "").toLowerCase();

    const date = getTransactionDate(transaction.created_at);
    const validDate = !Number.isNaN(date.getTime());

    const matchesSearch =
      productName.includes(searchText) ||
      barcode.includes(searchText);

    const matchesDate =
      selectedDate === "" ||
      (validDate && getDateKey(transaction.created_at) === selectedDate);

    const matchesMonth =
      selectedMonth === "All" ||
      (validDate && String(date.getMonth()) === selectedMonth);

    const matchesYear =
      selectedYear === "All" ||
      (validDate && String(date.getFullYear()) === selectedYear);

    const matchesType =
      selectedType === "All" ||
      transaction.transaction_type === selectedType;

    return (
      matchesSearch &&
      matchesDate &&
      matchesMonth &&
      matchesYear &&
      matchesType
    );
  });

  historyTableBody.innerHTML = "";
  resultCount.textContent =
    `${filteredHistory.length} transaction(s) found`;

  if (filteredHistory.length === 0) {
    emptyMessage.style.display = "block";
    return;
  }

  emptyMessage.style.display = "none";

  filteredHistory.forEach(function (transaction) {
    const style = getTransactionStyle(
      transaction.transaction_type,
      transaction
    );

    historyTableBody.innerHTML += `
      <tr>
        <td>${formatDateTime(transaction.created_at)}</td>
        <td>${escapeHtml(transaction.barcode)}</td>
        <td>${escapeHtml(transaction.product_name)}</td>
        <td>
          <span class="type ${style.className}">
            ${escapeHtml(transaction.transaction_type)}
          </span>
        </td>
        <td>${style.quantitySign}${Number(transaction.quantity || 0)}</td>
        <td>${Number(transaction.previous_stock ?? 0)}</td>
        <td>${Number(transaction.new_stock ?? 0)}</td>
        <td>${escapeHtml(transaction.reason)}</td>
        <td>${escapeHtml(transaction.note)}</td>
        <td>${escapeHtml(transaction.recorded_by_name || "Admin")}</td>
      </tr>
    `;
  });
}

async function loadHistory() {
  const { data, error } = await supabaseClient
    .from("stock_history")
    .select(`
      id,
      barcode,
      product_name,
      transaction_type,
      quantity,
      previous_stock,
      new_stock,
      reason,
      note,
      recorded_by_name,
      created_at
    `)
    .order("created_at", { ascending: false });

  if (error) {
    stockHistory = [];
    resultCount.textContent = "";
    emptyMessage.textContent =
      `Unable to load stock history: ${error.message}`;
    emptyMessage.style.display = "block";
    return;
  }

  stockHistory = data || [];
  populateYears();
  displayHistory();
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
    profile.role !== "Staff"
  ) {
    await supabaseClient.auth.signOut();
    localStorage.removeItem("currentUser");
    window.location.href = "login.html";
    return;
  }

  currentUser = {
    id: profile.id,
    username: profile.username,
    name: profile.full_name || profile.username,
    role: profile.role
  };

  localStorage.setItem("currentUser", JSON.stringify(currentUser));

  const displayName = currentUser.name;
  const firstLetter = displayName.charAt(0).toUpperCase();

  staffName.textContent = displayName;
  sidebarStaffName.textContent = displayName;
  staffAvatar.textContent = firstLetter;
  sidebarStaffAvatar.textContent = firstLetter;

  loadHistory();
}

searchInput.addEventListener("input", displayHistory);
dateFilter.addEventListener("change", displayHistory);
monthFilter.addEventListener("change", displayHistory);
yearFilter.addEventListener("change", displayHistory);
typeFilter.addEventListener("change", displayHistory);

clearFilterButton.addEventListener("click", function () {
  searchInput.value = "";
  dateFilter.value = "";
  monthFilter.value = "All";
  yearFilter.value = "All";
  typeFilter.value = "All";

  displayHistory();
});

logoutButton.addEventListener("click", logout);

initialisePage();