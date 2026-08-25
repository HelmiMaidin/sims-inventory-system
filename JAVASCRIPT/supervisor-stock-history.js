const SUPABASE_URL = "https://ocycijajjkqfsrcnpbmn.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_EDDbsmJyHARgnhGsQ_dcjA_HHItlr8T";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

let currentUser = null;
let stockHistory = [];

const supervisorName =
  document.getElementById("supervisorName");

const sidebarSupervisorName =
  document.getElementById("sidebarSupervisorName");

const supervisorAvatar =
  document.getElementById("supervisorAvatar");

const sidebarSupervisorAvatar =
  document.getElementById("sidebarSupervisorAvatar");

const logoutButton =
  document.getElementById("logoutButton");

const searchInput =
  document.getElementById("searchInput");

const typeFilter =
  document.getElementById("typeFilter");

const dateFilter =
  document.getElementById("dateFilter");

const clearDateButton =
  document.getElementById("clearDateButton");

const historyTableBody =
  document.getElementById("historyTableBody");

const resultCount =
  document.getElementById("resultCount");

const emptyMessage =
  document.getElementById("emptyMessage");

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
    return `
      <div class="date-time">
        <span>-</span>
      </div>
    `;
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
    return {
      className: "add-item",
      sign: "+"
    };
  }

  if (transaction.transaction_type === "Stock In") {
    return {
      className: "stock-in",
      sign: "+"
    };
  }

  if (transaction.transaction_type === "Stock Adjustment") {
    const isIncrease =
      Number(transaction.new_stock) >
      Number(transaction.previous_stock);

    return {
      className: "stock-adjustment",
      sign: isIncrease ? "+" : "-"
    };
  }

  return {
    className: "stock-out",
    sign: "-"
  };
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

    const date = getTransactionDate(transaction.created_at);

    const validDate =
      !Number.isNaN(date.getTime());

    const matchesSearch =
      productName.includes(searchText) ||
      barcode.includes(searchText);

    const matchesType =
      selectedType === "All" ||
      transaction.transaction_type === selectedType;

    const matchesDate =
      selectedDate === "" ||
      (
        validDate &&
        getDateKey(transaction.created_at) === selectedDate
      );

    return (
      matchesSearch &&
      matchesType &&
      matchesDate
    );
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
      </tr>
    `;
  });
}

function downloadCsvReport(filteredHistory) {
  let csvContent =
    "\uFEFFSIMS Stock History Report\n";

  csvContent +=
    `Generated,${new Date().toLocaleString()}\n`;

  csvContent +=
    `Prepared By,${currentUser.name}\n`;

  csvContent +=
    `Selected Date,${dateFilter.value || "All Dates"}\n`;

  csvContent +=
    `Transaction Type,${typeFilter.value}\n\n`;

  csvContent +=
    "Date,Time,Barcode,Product Name,Transaction,Quantity,Previous Quantity,New Quantity,Reason,Note,Recorded By\n";

  filteredHistory.forEach(function (transaction) {
    const date = getTransactionDate(transaction.created_at);
    const style = getTransactionStyle(transaction);

    csvContent +=
      `"${Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString()}",` +
      `"${Number.isNaN(date.getTime()) ? "-" : date.toLocaleTimeString()}",` +
      `"${transaction.barcode || "-"}",` +
      `"${transaction.product_name || "-"}",` +
      `"${transaction.transaction_type || "-"}",` +
      `"${style.sign}${Number(transaction.quantity || 0)}",` +
      `"${Number(transaction.previous_stock ?? 0)}",` +
      `"${Number(transaction.new_stock ?? 0)}",` +
      `"${transaction.reason || "-"}",` +
      `"${transaction.note || "-"}",` +
      `"${transaction.recorded_by_name || "Admin"}"\n`;
  });

  const file = new Blob(
    [csvContent],
    { type: "text/csv;charset=utf-8;" }
  );

  const link = document.createElement("a");

  link.href = URL.createObjectURL(file);

  link.download =
    `SIMS_Stock_History_${new Date().toISOString().slice(0, 10)}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(function () {
    URL.revokeObjectURL(link.href);
  }, 1000);
}

function exportExcel() {
  const filteredHistory = getFilteredHistory();

  if (filteredHistory.length === 0) {
    alert("There are no stock transactions to export.");
    return;
  }

  if (typeof XLSX === "undefined") {
    downloadCsvReport(filteredHistory);

    alert(
      "A CSV report was downloaded because the Excel design library could not load."
    );

    return;
  }

  try {
    const worksheetData = [
      ["SIMS STOCK HISTORY REPORT"],
      ["Inventory Transaction Audit"],
      ["Generated:", new Date().toLocaleString()],
      ["Prepared by:", currentUser.name],
      ["Selected date:", dateFilter.value || "All Dates"],
      ["Transaction type:", typeFilter.value],
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
      const date = getTransactionDate(transaction.created_at);
      const style = getTransactionStyle(transaction);

      worksheetData.push([
        Number.isNaN(date.getTime())
          ? "-"
          : date.toLocaleDateString(),

        Number.isNaN(date.getTime())
          ? "-"
          : date.toLocaleTimeString(),

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

    worksheetData.push([]);

    worksheetData.push([
      "TOTAL TRANSACTIONS",
      filteredHistory.length
    ]);

    const worksheet =
      XLSX.utils.aoa_to_sheet(worksheetData);

    worksheet["!merges"] = [
      {
        s: { r: 0, c: 0 },
        e: { r: 0, c: 10 }
      },
      {
        s: { r: 1, c: 0 },
        e: { r: 1, c: 10 }
      }
    ];

    worksheet["!cols"] = [
      { wch: 14 },
      { wch: 14 },
      { wch: 18 },
      { wch: 28 },
      { wch: 18 },
      { wch: 12 },
      { wch: 18 },
      { wch: 15 },
      { wch: 28 },
      { wch: 35 },
      { wch: 20 }
    ];

    worksheet["!autofilter"] = {
      ref: `A8:K${8 + filteredHistory.length}`
    };

    const thinBorder = {
      top: { style: "thin", color: { rgb: "E5E7EB" } },
      bottom: { style: "thin", color: { rgb: "E5E7EB" } },
      left: { style: "thin", color: { rgb: "E5E7EB" } },
      right: { style: "thin", color: { rgb: "E5E7EB" } }
    };

    const titleStyle = {
      font: {
        bold: true,
        color: { rgb: "FFFFFF" },
        sz: 16
      },
      fill: {
        fgColor: { rgb: "991B1B" }
      },
      alignment: {
        horizontal: "center",
        vertical: "center"
      }
    };

    const subtitleStyle = {
      font: {
        italic: true,
        color: { rgb: "7F1D1D" },
        sz: 11
      },
      fill: {
        fgColor: { rgb: "FEE2E2" }
      },
      alignment: {
        horizontal: "center",
        vertical: "center"
      }
    };

    const headerStyle = {
      font: {
        bold: true,
        color: { rgb: "FFFFFF" }
      },
      fill: {
        fgColor: { rgb: "DC2626" }
      },
      alignment: {
        horizontal: "center",
        vertical: "center",
        wrapText: true
      },
      border: thinBorder
    };

    const bodyStyle = {
      alignment: {
        vertical: "center"
      },
      border: thinBorder
    };

    const alternateRowStyle = {
      fill: {
        fgColor: { rgb: "FFF7F7" }
      },
      alignment: {
        vertical: "center"
      },
      border: thinBorder
    };

    const totalLabelStyle = {
      font: {
        bold: true,
        color: { rgb: "7F1D1D" }
      },
      fill: {
        fgColor: { rgb: "FEE2E2" }
      },
      border: thinBorder
    };

    const totalValueStyle = {
      font: {
        bold: true,
        color: { rgb: "991B1B" }
      },
      fill: {
        fgColor: { rgb: "FFF1F2" }
      },
      alignment: {
        horizontal: "right"
      },
      border: thinBorder
    };

    worksheet["A1"].s = titleStyle;
    worksheet["A2"].s = subtitleStyle;

    for (let column = 0; column <= 10; column++) {
      const cell = XLSX.utils.encode_cell({
        r: 7,
        c: column
      });

      worksheet[cell].s = headerStyle;
    }

    filteredHistory.forEach(function (transaction, index) {
      const row = 8 + index;

      const rowStyle = index % 2 === 0
        ? bodyStyle
        : alternateRowStyle;

      for (let column = 0; column <= 10; column++) {
        const cell = XLSX.utils.encode_cell({
          r: row,
          c: column
        });

        worksheet[cell].s = rowStyle;
      }
    });

    const totalRow = 10 + filteredHistory.length;

    worksheet[`A${totalRow}`].s = totalLabelStyle;
    worksheet[`B${totalRow}`].s = totalValueStyle;

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Stock History"
    );

    XLSX.writeFile(
      workbook,
      `SIMS_Stock_History_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  } catch (error) {
    downloadCsvReport(filteredHistory);

    alert(
      "The styled Excel report could not be created, so SIMS downloaded a CSV report instead."
    );
  }
}

function exportPdf() {
  const filteredHistory = getFilteredHistory();

  if (filteredHistory.length === 0) {
    alert("There are no stock transactions to print.");
    return;
  }

  let tableRows = "";

  filteredHistory.forEach(function (transaction) {
    const date = getTransactionDate(transaction.created_at);
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
    alert(
      "Your browser blocked the print window. Please allow pop-ups and try again."
    );

    return;
  }

  printWindow.document.write(`
    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>SIMS Stock History Report</title>

      <style>
        body {
          margin: 25px;
          color: #1f2937;
          font-family: Arial, sans-serif;
        }

        h1 {
          margin: 0 0 6px;
          color: #b91c1c;
          font-size: 24px;
        }

        p {
          margin: 4px 0;
          color: #4b5563;
          font-size: 13px;
        }

        .summary {
          padding: 12px;
          margin: 20px 0;
          background: #fef2f2;
          border-left: 4px solid #dc2626;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th,
        td {
          padding: 7px;
          font-size: 9px;
          text-align: left;
          border: 1px solid #d1d5db;
        }

        th {
          color: white;
          background: #b91c1c;
        }

        @media print {
          body {
            margin: 12px;
          }
        }
      </style>
    </head>

    <body>
      <h1>SIMS Stock History Report</h1>

      <p>Generated: ${new Date().toLocaleString()}</p>
      <p>Prepared by: ${escapeHtml(currentUser.name)}</p>

      <div class="summary">
        <strong>Selected date:</strong>
        ${escapeHtml(dateFilter.value || "All Dates")}
        <br>

        <strong>Transaction type:</strong>
        ${escapeHtml(typeFilter.value)}
        <br>

        <strong>Total transactions:</strong>
        ${filteredHistory.length}
      </div>

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

  printWindow.onload = function () {
    printWindow.print();
  };
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
    profile.role !== "Supervisor"
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

  localStorage.setItem(
    "currentUser",
    JSON.stringify(currentUser)
  );

  const displayName = currentUser.name;
  const firstLetter = displayName.charAt(0).toUpperCase();

  supervisorName.textContent = displayName;
  sidebarSupervisorName.textContent = displayName;

  supervisorAvatar.textContent = firstLetter;
  sidebarSupervisorAvatar.textContent = firstLetter;

  loadHistory();
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

exportExcelButton.addEventListener("click", exportExcel);
exportPdfButton.addEventListener("click", exportPdf);
logoutButton.addEventListener("click", logout);

initialisePage();