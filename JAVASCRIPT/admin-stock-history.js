const SUPABASE_URL = "https://ocycijajjkqfsrcnpbmn.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_EDDbsmJyHARgnhGsQ_dcjA_HHItlr8T";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

let currentUser = null;
let stockHistory = [];

const adminName = document.getElementById("adminName");
const sidebarAdminName = document.getElementById("sidebarAdminName");

const adminAvatar = document.getElementById("adminAvatar");
const sidebarAdminAvatar =
  document.getElementById("sidebarAdminAvatar");

const logoutButton = document.getElementById("logoutButton");

const searchInput = document.getElementById("searchInput");
const typeFilter = document.getElementById("typeFilter");
const dateFilter = document.getElementById("dateFilter");
const clearDateButton = document.getElementById("clearDateButton");

const historyTableBody =
  document.getElementById("historyTableBody");

const resultCount = document.getElementById("resultCount");
const emptyMessage = document.getElementById("emptyMessage");

const exportExcelButton =
  document.getElementById("exportExcelButton");

const exportPdfButton =
  document.getElementById("exportPdfButton");

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
    return `<div class="date-time"><span>-</span></div>`;
  }

  return `
    <div class="date-time">
      <span>${date.toLocaleDateString()}</span>
      <small>${date.toLocaleTimeString()}</small>
    </div>
  `;
}

function getTransactionStyle(transaction) {
  if (transaction.transaction_type === "Add Item") {
    return { className: "add-item", sign: "+" };
  }

  if (transaction.transaction_type === "Stock In") {
    return { className: "stock-in", sign: "+" };
  }

  if (transaction.transaction_type === "Stock Adjustment") {
    const increased =
      Number(transaction.new_stock) >
      Number(transaction.previous_stock);

    return {
      className: "stock-adjustment",
      sign: increased ? "+" : "-"
    };
  }

  return { className: "stock-out", sign: "-" };
}

function getFilteredHistory() {
  const searchText =
    searchInput.value.trim().toLowerCase();

  const selectedType = typeFilter.value;
  const selectedDate = dateFilter.value;

  return stockHistory.filter(function (transaction) {
    const productName =
      String(transaction.product_name || "").toLowerCase();

    const barcode =
      String(transaction.barcode || "").toLowerCase();

    const matchesSearch =
      productName.includes(searchText) ||
      barcode.includes(searchText);

    const matchesType =
      selectedType === "All" ||
      transaction.transaction_type === selectedType;

    const matchesDate =
      selectedDate === "" ||
      getDateKey(transaction.created_at) === selectedDate;

    return matchesSearch && matchesType && matchesDate;
  });
}

function displayHistory() {
  const filteredHistory = getFilteredHistory();

  historyTableBody.innerHTML = "";

  resultCount.textContent =
    `${filteredHistory.length} transaction(s) found`;

  if (filteredHistory.length === 0) {
    emptyMessage.style.display = "block";
    return;
  }

  emptyMessage.style.display = "none";

  filteredHistory.forEach(function (transaction) {
    const style = getTransactionStyle(transaction);

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
        <td>${style.sign}${Number(transaction.quantity || 0)}</td>
        <td>${Number(transaction.previous_stock ?? 0)}</td>
        <td>${Number(transaction.new_stock ?? 0)}</td>
        <td>${escapeHtml(transaction.reason)}</td>
        <td>${escapeHtml(transaction.note)}</td>
        <td>${escapeHtml(transaction.recorded_by_name || "Admin")}</td>
        <td>
          <button
            class="delete-button"
            type="button"
            data-history-id="${transaction.id}"
            data-product-name="${escapeHtml(transaction.product_name)}"
            data-transaction-type="${escapeHtml(transaction.transaction_type)}"
          >
            Delete
          </button>
        </td>
      </tr>
    `;
  });
}

async function deleteHistoryRecord(historyId, productName, transactionType) {
  const confirmed = confirm(
    `Delete this ${transactionType} record for "${productName}"?\n\nThis cannot be undone and will not change the product's current quantity.`
  );

  if (!confirmed) {
    return;
  }

  const { error } = await supabaseClient.rpc(
    "admin_delete_stock_history",
    {
      p_history_id: historyId
    }
  );

  if (error) {
    alert(`Unable to delete history record: ${error.message}`);
    return;
  }

  stockHistory = stockHistory.filter(function (transaction) {
    return transaction.id !== historyId;
  });

  displayHistory();
}

async function exportExcel() {
  const filteredHistory = getFilteredHistory();

  if (filteredHistory.length === 0) {
    alert("There are no transactions to export.");
    return;
  }

  if (!window.XLSX) {
    alert("Excel export library is not available. Please refresh the page.");
    return;
  }

  const workbook = XLSX.utils.book_new();

  const rows = [
    ["SIMS ADMIN STOCK HISTORY REPORT"],
    ["Generated", new Date().toLocaleString()],
    ["Prepared By", currentUser.name],
    [],
    [
      "Date",
      "Time",
      "Barcode",
      "Product Name",
      "Transaction",
      "Quantity",
      "Previous Quantity",
      "New Quantity",
      "Reason",
      "Note",
      "Recorded By"
    ]
  ];

  filteredHistory.forEach(function (transaction) {
    const date = new Date(transaction.created_at);
    const style = getTransactionStyle(transaction);

    rows.push([
      Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString(),
      Number.isNaN(date.getTime()) ? "-" : date.toLocaleTimeString(),
      transaction.barcode || "-",
      transaction.product_name || "-",
      transaction.transaction_type || "-",
      `${style.sign}${Number(transaction.quantity || 0)}`,
      Number(transaction.previous_stock ?? 0),
      Number(transaction.new_stock ?? 0),
      transaction.reason || "-",
      transaction.note || "-",
      transaction.recorded_by_name || "Admin"
    ]);
  });

  const sheet = XLSX.utils.aoa_to_sheet(rows);

  sheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }
  ];

  sheet["!cols"] = [
    { wch: 14 },
    { wch: 14 },
    { wch: 18 },
    { wch: 25 },
    { wch: 18 },
    { wch: 12 },
    { wch: 18 },
    { wch: 15 },
    { wch: 28 },
    { wch: 35 },
    { wch: 20 }
  ];

  sheet["A1"].s = {
    font: {
      bold: true,
      color: { rgb: "FFFFFF" },
      sz: 16
    },
    fill: {
      fgColor: { rgb: "6D28D9" }
    },
    alignment: {
      horizontal: "center"
    }
  };

  for (let column = 0; column <= 10; column++) {
    const headerCell =
      XLSX.utils.encode_cell({ r: 4, c: column });

    sheet[headerCell].s = {
      font: {
        bold: true,
        color: { rgb: "FFFFFF" }
      },
      fill: {
        fgColor: { rgb: "7C3AED" }
      },
      alignment: {
        horizontal: "center",
        vertical: "center",
        wrapText: true
      }
    };
  }

  XLSX.utils.book_append_sheet(
    workbook,
    sheet,
    "Stock History"
  );

  XLSX.writeFile(
    workbook,
    "sims-admin-stock-history.xlsx"
  );
}

function exportPdf() {
  const filteredHistory = getFilteredHistory();

  if (filteredHistory.length === 0) {
    alert("There are no transactions to print.");
    return;
  }

  let tableRows = "";

  filteredHistory.forEach(function (transaction) {
    const date = new Date(transaction.created_at);
    const style = getTransactionStyle(transaction);

    tableRows += `
      <tr>
        <td>${Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString()}</td>
        <td>${Number.isNaN(date.getTime()) ? "-" : date.toLocaleTimeString()}</td>
        <td>${escapeHtml(transaction.barcode)}</td>
        <td>${escapeHtml(transaction.product_name)}</td>
        <td>${escapeHtml(transaction.transaction_type)}</td>
        <td>${style.sign}${Number(transaction.quantity || 0)}</td>
        <td>${Number(transaction.previous_stock ?? 0)}</td>
        <td>${Number(transaction.new_stock ?? 0)}</td>
        <td>${escapeHtml(transaction.reason)}</td>
        <td>${escapeHtml(transaction.note)}</td>
        <td>${escapeHtml(transaction.recorded_by_name || "Admin")}</td>
      </tr>
    `;
  });

  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    alert("Your browser blocked the print window. Please allow pop-ups.");
    return;
  }

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>SIMS Admin Stock History Report</title>
        <style>
          body {
            padding: 25px;
            color: #24153d;
            font-family: Arial, sans-serif;
          }

          h1 {
            margin-bottom: 6px;
            color: #6d28d9;
          }

          p {
            color: #64748b;
          }

          table {
            width: 100%;
            margin-top: 20px;
            border-collapse: collapse;
          }

          th,
          td {
            padding: 8px;
            font-size: 10px;
            text-align: left;
            border: 1px solid #cbd5e1;
          }

          th {
            color: white;
            background: #6d28d9;
          }
        </style>
      </head>

      <body>
        <h1>SIMS Admin Stock History Report</h1>

        <p>
          Selected Date: ${dateFilter.value || "All Dates"}<br>
          Generated: ${new Date().toLocaleString()}<br>
          Prepared By: ${escapeHtml(currentUser.name)}
        </p>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Barcode</th>
              <th>Product</th>
              <th>Transaction</th>
              <th>Quantity</th>
              <th>Previous</th>
              <th>New</th>
              <th>Reason</th>
              <th>Note</th>
              <th>Recorded By</th>
            </tr>
          </thead>

          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.print();
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
    emptyMessage.textContent =
      `Unable to load stock history: ${error.message}`;

    emptyMessage.style.display = "block";
    return;
  }

  stockHistory = data || [];
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
    profile.role !== "Admin"
  ) {
    await supabaseClient.auth.signOut();
    window.location.href = "login.html";
    return;
  }

  currentUser = {
    id: profile.id,
    username: profile.username,
    name: profile.full_name,
    role: profile.role
  };

  localStorage.setItem(
    "currentUser",
    JSON.stringify(currentUser)
  );

  const firstName =
    currentUser.name.split(" ")[0] || "Admin";

  const initial =
    firstName.charAt(0).toUpperCase() || "A";

  adminName.textContent = currentUser.name;
  sidebarAdminName.textContent = currentUser.name;

  adminAvatar.textContent = initial;
  sidebarAdminAvatar.textContent = initial;

  await loadHistory();
}

searchInput.addEventListener("input", displayHistory);
typeFilter.addEventListener("change", displayHistory);
dateFilter.addEventListener("change", displayHistory);

clearDateButton.addEventListener("click", function () {
  searchInput.value = "";
  typeFilter.value = "All";
  dateFilter.value = "";

  displayHistory();
});

historyTableBody.addEventListener("click", function (event) {
  const deleteButton =
    event.target.closest(".delete-button");

  if (!deleteButton) {
    return;
  }

  deleteHistoryRecord(
    deleteButton.dataset.historyId,
    deleteButton.dataset.productName,
    deleteButton.dataset.transactionType
  );
});

exportExcelButton.addEventListener("click", exportExcel);
exportPdfButton.addEventListener("click", exportPdf);
logoutButton.addEventListener("click", logout);

initialisePage();