const SUPABASE_URL = "https://ocycijajjkqfsrcnpbmn.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_EDDbsmJyHARgnhGsQ_dcjA_HHItlr8T";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

let currentUser = null;
let stockHistory = [];
let products = [];
let spendChart = null;

const adminName = document.getElementById("adminName");
const sidebarAdminName = document.getElementById("sidebarAdminName");

const adminAvatar = document.getElementById("adminAvatar");
const sidebarAdminAvatar =
  document.getElementById("sidebarAdminAvatar");

const logoutButton = document.getElementById("logoutButton");

const recordCount = document.getElementById("recordCount");
const totalQuantity = document.getElementById("totalQuantity");
const totalSpend = document.getElementById("totalSpend");

const yearFilter = document.getElementById("yearFilter");
const monthFilter = document.getElementById("monthFilter");

const clearFiltersButton =
  document.getElementById("clearFiltersButton");

const exportAnnualReportButton =
  document.getElementById("exportAnnualReportButton");

const summaryTableBody =
  document.getElementById("summaryTableBody");

const emptyMessage =
  document.getElementById("emptyMessage");

function escapeHtml(value) {
  return String(value ?? "-")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getDate(transaction) {
  return new Date(transaction.created_at);
}

function getItemStatus(transaction) {
  const product = products.find(function (item) {
    return item.barcode === transaction.barcode;
  });

  if (!product) {
    return {
      text: "Deleted",
      className: "deleted-status"
    };
  }

  if (product.archived === true) {
    return {
      text: "Archived",
      className: "archived-status"
    };
  }

  return {
    text: "Active",
    className: "active-status"
  };
}

function getUnitPrice(transaction) {
  return Number(transaction.unit_price || 0);
}

function getTotalSpend(transaction) {
  return Number(transaction.quantity || 0) *
    getUnitPrice(transaction);
}

function getAddedRecords() {
  const selectedYear = yearFilter.value;
  const selectedMonth = monthFilter.value;

  return stockHistory.filter(function (transaction) {
    const isAddedStock =
      transaction.transaction_type === "Stock In" ||
      transaction.transaction_type === "Add Item";

    if (!isAddedStock) {
      return false;
    }

    const date = getDate(transaction);

    if (Number.isNaN(date.getTime())) {
      return false;
    }

    const transactionYear = String(date.getFullYear());
    const transactionMonth = String(date.getMonth() + 1).padStart(2, "0");

    const matchesYear =
      selectedYear === "All" ||
      transactionYear === selectedYear;

    const matchesMonth =
      selectedMonth === "All" ||
      transactionMonth === selectedMonth;

    return matchesYear && matchesMonth;
  });
}

function populateYears() {
  const currentSelectedYear = yearFilter.value;

  yearFilter.innerHTML =
    `<option value="All">All Years</option>`;

  const years = [];

  stockHistory.forEach(function (transaction) {
    const date = getDate(transaction);

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

  if (years.includes(Number(currentSelectedYear))) {
    yearFilter.value = currentSelectedYear;
  }
}

function displaySummaryTable(records) {
  summaryTableBody.innerHTML = "";

  if (records.length === 0) {
    emptyMessage.style.display = "block";
    return;
  }

  emptyMessage.style.display = "none";

  records.forEach(function (transaction) {
    const date = getDate(transaction);
    const itemStatus = getItemStatus(transaction);
    const unitPrice = getUnitPrice(transaction);
    const recordTotal = getTotalSpend(transaction);

    summaryTableBody.innerHTML += `
      <tr>
        <td>
          ${date.toLocaleDateString()}<br>
          <small>${date.toLocaleTimeString()}</small>
        </td>
        <td>${escapeHtml(transaction.transaction_type)}</td>
        <td>${escapeHtml(transaction.barcode)}</td>
        <td>${escapeHtml(transaction.product_name)}</td>
        <td>
          <span class="status ${itemStatus.className}">
            ${itemStatus.text}
          </span>
        </td>
        <td>+${Number(transaction.quantity || 0)}</td>
        <td>RM ${unitPrice.toFixed(2)}</td>
        <td>RM ${recordTotal.toFixed(2)}</td>
        <td>${escapeHtml(transaction.reason)}</td>
        <td>${escapeHtml(transaction.recorded_by_name || "Admin")}</td>
      </tr>
    `;
  });
}

function createSpendChart(records) {
  if (spendChart) {
    spendChart.destroy();
  }

  const monthlySpend = {};

  records.forEach(function (transaction) {
    const date = getDate(transaction);

    const label = date.toLocaleDateString("en-MY", {
      month: "short",
      year: "numeric"
    });

    if (!monthlySpend[label]) {
      monthlySpend[label] = 0;
    }

    monthlySpend[label] += getTotalSpend(transaction);
  });

  const labels = Object.keys(monthlySpend);
  const values = Object.values(monthlySpend);

  spendChart = new Chart(
    document.getElementById("spendChart"),
    {
      type: "bar",

      data: {
        labels: labels.length ? labels : ["No Data"],
        datasets: [{
          label: "Total Spend (RM)",
          data: values.length ? values : [0],
          backgroundColor: "#7c3aed",
          borderRadius: 8,
          borderSkipped: false
        }]
      },

      options: {
        responsive: true,
        maintainAspectRatio: false,

        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (value) {
                return `RM ${value}`;
              }
            }
          },

          x: {
            grid: {
              display: false
            }
          }
        },

        plugins: {
          legend: {
            display: false
          }
        }
      }
    }
  );
}

function displaySummary() {
  const records = getAddedRecords();

  const quantity = records.reduce(function (total, transaction) {
    return total + Number(transaction.quantity || 0);
  }, 0);

  const spend = records.reduce(function (total, transaction) {
    return total + getTotalSpend(transaction);
  }, 0);

  recordCount.textContent = records.length;
  totalQuantity.textContent = quantity;
  totalSpend.textContent = `RM ${spend.toFixed(2)}`;

  displaySummaryTable(records);
  createSpendChart(records);
}

function exportReport() {
  const records = getAddedRecords();

  if (records.length === 0) {
    alert("There are no stock-added records to export.");
    return;
  }

  if (!window.XLSX) {
    alert("Excel library is unavailable. Please refresh and try again.");
    return;
  }

  const selectedYear =
    yearFilter.value === "All"
      ? "All Years"
      : yearFilter.value;

  const selectedMonth =
    monthFilter.options[monthFilter.selectedIndex].text;

  const totalRecordSpend = records.reduce(function (total, transaction) {
    return total + getTotalSpend(transaction);
  }, 0);

  const totalRecordQuantity = records.reduce(function (total, transaction) {
    return total + Number(transaction.quantity || 0);
  }, 0);

  const rows = [
    ["SIMS ITEM SUMMARY REPORT"],
    ["Period", `${selectedMonth} · ${selectedYear}`],
    ["Generated", new Date().toLocaleString()],
    ["Prepared By", currentUser.name],
    [],
    [
      "Date",
      "Time",
      "Activity Type",
      "Barcode",
      "Product Name",
      "Item Status",
      "Quantity Added",
      "Unit Price (RM)",
      "Total Spend (RM)",
      "Reason",
      "Recorded By"
    ]
  ];

  records.forEach(function (transaction) {
    const date = getDate(transaction);
    const itemStatus = getItemStatus(transaction);

    rows.push([
      date.toLocaleDateString(),
      date.toLocaleTimeString(),
      transaction.transaction_type,
      transaction.barcode,
      transaction.product_name,
      itemStatus.text,
      Number(transaction.quantity || 0),
      getUnitPrice(transaction),
      getTotalSpend(transaction),
      transaction.reason || "-",
      transaction.recorded_by_name || "Admin"
    ]);
  });

  rows.push([]);
  rows.push(["TOTAL RECORDS", records.length]);
  rows.push(["TOTAL QUANTITY ADDED", totalRecordQuantity]);
  rows.push(["TOTAL STOCK SPEND (RM)", totalRecordSpend]);

  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(rows);

  sheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }
  ];

  sheet["!cols"] = [
    { wch: 13 },
    { wch: 14 },
    { wch: 18 },
    { wch: 18 },
    { wch: 28 },
    { wch: 14 },
    { wch: 16 },
    { wch: 17 },
    { wch: 18 },
    { wch: 30 },
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
      XLSX.utils.encode_cell({ r: 5, c: column });

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
    "Item Summary"
  );

  XLSX.writeFile(
    workbook,
    "sims-item-summary-report.xlsx"
  );
}

async function loadData() {
  const [historyResult, productsResult] = await Promise.all([
    supabaseClient
      .from("stock_history")
      .select(`
        id,
        barcode,
        product_name,
        transaction_type,
        quantity,
        unit_price,
        reason,
        recorded_by_name,
        created_at
      `)
      .order("created_at", { ascending: false }),

    supabaseClient
      .from("products")
      .select("barcode, archived")
  ]);

  if (historyResult.error) {
    alert(`Unable to load stock records: ${historyResult.error.message}`);
    return;
  }

  if (productsResult.error) {
    alert(`Unable to load products: ${productsResult.error.message}`);
    return;
  }

  stockHistory = historyResult.data || [];
  products = productsResult.data || [];

  populateYears();
  displaySummary();
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
  const { data, error } =
    await supabaseClient.auth.getSession();

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

  const firstName =
    currentUser.name.split(" ")[0] || "Admin";

  const initial =
    firstName.charAt(0).toUpperCase() || "A";

  adminName.textContent = currentUser.name;
  sidebarAdminName.textContent = currentUser.name;
  adminAvatar.textContent = initial;
  sidebarAdminAvatar.textContent = initial;

  await loadData();
}

yearFilter.addEventListener("change", displaySummary);
monthFilter.addEventListener("change", displaySummary);

clearFiltersButton.addEventListener("click", function () {
  yearFilter.value = "All";
  monthFilter.value = "All";

  displaySummary();
});

exportAnnualReportButton.addEventListener(
  "click",
  exportReport
);

logoutButton.addEventListener("click", logout);

initialisePage();