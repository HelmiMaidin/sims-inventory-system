const SUPABASE_URL = "https://ocycijajjkqfsrcnpbmn.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_EDDbsmJyHARgnhGsQ_dcjA_HHItlr8T";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

let currentUser = null;
let products = [];

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

const lowStockTableBody =
  document.getElementById("lowStockTableBody");

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

function getLowStockItems() {
  return products
    .filter(function (product) {
      const stock = Number(product.stock || 0);

      const minimumStock =
        Number(product.minimum_stock || 0);

      return (
        product.archived !== true &&
        stock <= minimumStock
      );
    })
    .sort(function (firstProduct, secondProduct) {
      return Number(firstProduct.stock || 0) -
        Number(secondProduct.stock || 0);
    });
}

function getAvailability(product) {
  if (Number(product.stock || 0) <= 0) {
    return {
      text: "Out of Stock",
      className: "out-of-stock"
    };
  }

  return {
    text: "Low Stock",
    className: "low-stock"
  };
}

function getRestockQuantity(product) {
  const currentStock = Number(product.stock || 0);

  const minimumStock =
    Number(product.minimum_stock || 0);

  return Math.max(minimumStock - currentStock, 0);
}

function getRestockCost(product) {
  return getRestockQuantity(product) *
    Number(product.price || 0);
}

function displayLowStockItems() {
  const lowStockItems = getLowStockItems();

  lowStockTableBody.innerHTML = "";

  resultCount.textContent =
    `${lowStockItems.length} item(s) require restocking`;

  if (lowStockItems.length === 0) {
    emptyMessage.style.display = "block";
    return;
  }

  emptyMessage.style.display = "none";

  lowStockItems.forEach(function (product) {
    const availability = getAvailability(product);

    lowStockTableBody.innerHTML += `
      <tr>
        <td>${escapeHtml(product.barcode)}</td>
        <td>${escapeHtml(product.name)}</td>
        <td>${escapeHtml(product.category)}</td>
        <td>${Number(product.stock || 0)}</td>
        <td>${Number(product.minimum_stock || 0)}</td>
        <td>${escapeHtml(product.unit)}</td>
        <td>RM ${Number(product.price || 0).toFixed(2)}</td>
        <td>
          <span class="status ${availability.className}">
            ${availability.text}
          </span>
        </td>
      </tr>
    `;
  });
}

function downloadCsvReport(lowStockItems) {
  let csvContent =
    "\uFEFFSIMS Low Stock Items Report\n";

  csvContent +=
    `Generated,${new Date().toLocaleString()}\n`;

  csvContent +=
    `Prepared By,${currentUser.name}\n\n`;

  csvContent +=
    "Barcode,Product Name,Category,Current Quantity,Minimum Quantity,Quantity Needed,Unit,Unit Price (RM),Estimated Restock Cost (RM),Availability\n";

  lowStockItems.forEach(function (product) {
    csvContent +=
      `"${product.barcode || "-"}",` +
      `"${product.name || "-"}",` +
      `"${product.category || "-"}",` +
      `"${Number(product.stock || 0)}",` +
      `"${Number(product.minimum_stock || 0)}",` +
      `"${getRestockQuantity(product)}",` +
      `"${product.unit || "-"}",` +
      `"${Number(product.price || 0).toFixed(2)}",` +
      `"${getRestockCost(product).toFixed(2)}",` +
      `"${getAvailability(product).text}"\n`;
  });

  const totalRestockCost = lowStockItems.reduce(
    function (total, product) {
      return total + getRestockCost(product);
    },
    0
  );

  csvContent += "\n";

  csvContent +=
    `Total Low-Stock Items,${lowStockItems.length}\n`;

  csvContent +=
    `Total Estimated Restock Cost (RM),${totalRestockCost.toFixed(2)}\n`;

  const file = new Blob(
    [csvContent],
    { type: "text/csv;charset=utf-8;" }
  );

  const link = document.createElement("a");

  link.href = URL.createObjectURL(file);

  link.download =
    `SIMS_Low_Stock_Report_${new Date().toISOString().slice(0, 10)}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(function () {
    URL.revokeObjectURL(link.href);
  }, 1000);
}

function exportExcel() {
  const lowStockItems = getLowStockItems();

  if (lowStockItems.length === 0) {
    alert("There are no low-stock items to export.");
    return;
  }

  if (typeof XLSX === "undefined") {
    downloadCsvReport(lowStockItems);

    alert(
      "A CSV report was downloaded because the Excel design library could not load."
    );

    return;
  }

  try {
    const totalRestockCost = lowStockItems.reduce(
      function (total, product) {
        return total + getRestockCost(product);
      },
      0
    );

    const worksheetData = [
      ["SIMS LOW STOCK ITEMS REPORT"],
      ["Restock Monitoring Report"],
      ["Generated:", new Date().toLocaleString()],
      ["Prepared by:", currentUser.name],
      [],
      [
        "Barcode",
        "Product Name",
        "Category",
        "Current Quantity",
        "Minimum Quantity",
        "Quantity Needed",
        "Unit",
        "Unit Price (RM)",
        "Estimated Restock Cost (RM)",
        "Availability"
      ]
    ];

    lowStockItems.forEach(function (product) {
      worksheetData.push([
        product.barcode || "-",
        product.name || "-",
        product.category || "-",
        Number(product.stock || 0),
        Number(product.minimum_stock || 0),
        getRestockQuantity(product),
        product.unit || "-",
        Number(product.price || 0),
        getRestockCost(product),
        getAvailability(product).text
      ]);
    });

    worksheetData.push([]);

    worksheetData.push([
      "TOTAL LOW-STOCK ITEMS",
      lowStockItems.length
    ]);

    worksheetData.push([
      "TOTAL ESTIMATED RESTOCK COST (RM)",
      totalRestockCost
    ]);

    const worksheet =
      XLSX.utils.aoa_to_sheet(worksheetData);

    worksheet["!merges"] = [
      {
        s: { r: 0, c: 0 },
        e: { r: 0, c: 9 }
      },
      {
        s: { r: 1, c: 0 },
        e: { r: 1, c: 9 }
      }
    ];

    worksheet["!cols"] = [
      { wch: 18 },
      { wch: 28 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 17 },
      { wch: 12 },
      { wch: 17 },
      { wch: 29 },
      { wch: 16 }
    ];

    worksheet["!rows"] = [
      { hpt: 28 },
      { hpt: 20 },
      { hpt: 18 },
      { hpt: 18 },
      { hpt: 8 },
      { hpt: 32 }
    ];

    worksheet["!autofilter"] = {
      ref: `A6:J${6 + lowStockItems.length}`
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

    const normalRowStyle = {
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

    const outOfStockStyle = {
      font: {
        bold: true,
        color: { rgb: "B91C1C" }
      },
      fill: {
        fgColor: { rgb: "FEE2E2" }
      },
      alignment: {
        horizontal: "center",
        vertical: "center"
      },
      border: thinBorder
    };

    const lowStockStyle = {
      font: {
        bold: true,
        color: { rgb: "C2410C" }
      },
      fill: {
        fgColor: { rgb: "FFEDD5" }
      },
      alignment: {
        horizontal: "center",
        vertical: "center"
      },
      border: thinBorder
    };

    const summaryLabelStyle = {
      font: {
        bold: true,
        color: { rgb: "7F1D1D" }
      },
      fill: {
        fgColor: { rgb: "FEE2E2" }
      },
      border: thinBorder
    };

    const summaryValueStyle = {
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

    worksheet["A3"].s = {
      font: {
        bold: true,
        color: { rgb: "4B5563" }
      }
    };

    worksheet["A4"].s = {
      font: {
        bold: true,
        color: { rgb: "4B5563" }
      }
    };

    for (let column = 0; column <= 9; column++) {
      const cell = XLSX.utils.encode_cell({
        r: 5,
        c: column
      });

      worksheet[cell].s = headerStyle;
    }

    lowStockItems.forEach(function (product, index) {
      const row = 6 + index;

      const rowStyle = index % 2 === 0
        ? normalRowStyle
        : alternateRowStyle;

      for (let column = 0; column <= 9; column++) {
        const cell = XLSX.utils.encode_cell({
          r: row,
          c: column
        });

        worksheet[cell].s = rowStyle;
      }

      const unitPriceCell =
        XLSX.utils.encode_cell({ r: row, c: 7 });

      const restockCostCell =
        XLSX.utils.encode_cell({ r: row, c: 8 });

      const availabilityCell =
        XLSX.utils.encode_cell({ r: row, c: 9 });

      worksheet[unitPriceCell].z = '"RM" #,##0.00';

      worksheet[restockCostCell].z = '"RM" #,##0.00';

      worksheet[availabilityCell].s =
        Number(product.stock || 0) <= 0
          ? outOfStockStyle
          : lowStockStyle;
    });

    const totalItemsRow = 8 + lowStockItems.length;
    const totalCostRow = 9 + lowStockItems.length;

    worksheet[`A${totalItemsRow}`].s =
      summaryLabelStyle;

    worksheet[`B${totalItemsRow}`].s =
      summaryValueStyle;

    worksheet[`A${totalCostRow}`].s =
      summaryLabelStyle;

    worksheet[`B${totalCostRow}`].s =
      summaryValueStyle;

    worksheet[`B${totalCostRow}`].z =
      '"RM" #,##0.00';

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Low Stock Report"
    );

    XLSX.writeFile(
      workbook,
      `SIMS_Low_Stock_Report_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  } catch (error) {
    downloadCsvReport(lowStockItems);

    alert(
      "The styled Excel report could not be created, so SIMS downloaded a CSV report instead."
    );
  }
}

function exportPdf() {
  const lowStockItems = getLowStockItems();

  if (lowStockItems.length === 0) {
    alert("There are no low-stock items to print.");
    return;
  }

  const totalRestockCost = lowStockItems.reduce(
    function (total, product) {
      return total + getRestockCost(product);
    },
    0
  );

  let tableRows = "";

  lowStockItems.forEach(function (product) {
    tableRows += `
      <tr>
        <td>${escapeHtml(product.barcode)}</td>
        <td>${escapeHtml(product.name)}</td>
        <td>${escapeHtml(product.category)}</td>
        <td>${Number(product.stock || 0)}</td>
        <td>${Number(product.minimum_stock || 0)}</td>
        <td>${getRestockQuantity(product)}</td>
        <td>${escapeHtml(product.unit)}</td>
        <td>RM ${Number(product.price || 0).toFixed(2)}</td>
        <td>RM ${getRestockCost(product).toFixed(2)}</td>
        <td>${getAvailability(product).text}</td>
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
      <title>SIMS Low Stock Items Report</title>

      <style>
        body {
          margin: 30px;
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
          padding: 8px;
          font-size: 11px;
          text-align: left;
          border: 1px solid #d1d5db;
        }

        th {
          color: white;
          background: #b91c1c;
        }
      </style>
    </head>

    <body>
      <h1>SIMS Low Stock Items Report</h1>

      <p>Generated: ${new Date().toLocaleString()}</p>
      <p>Prepared by: ${escapeHtml(currentUser.name)}</p>

      <div class="summary">
        <strong>Total low-stock items:</strong>
        ${lowStockItems.length}
        <br>

        <strong>Total estimated restock cost:</strong>
        RM ${totalRestockCost.toFixed(2)}
      </div>

      <table>
        <thead>
          <tr>
            <th>Barcode</th>
            <th>Product Name</th>
            <th>Category</th>
            <th>Current</th>
            <th>Minimum</th>
            <th>Needed</th>
            <th>Unit</th>
            <th>Unit Price</th>
            <th>Restock Cost</th>
            <th>Availability</th>
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

async function loadProducts() {
  const { data, error } = await supabaseClient
    .from("products")
    .select(`
      id,
      barcode,
      name,
      category,
      unit,
      stock,
      minimum_stock,
      price,
      archived
    `)
    .order("name", { ascending: true });

  if (error) {
    lowStockTableBody.innerHTML = "";
    resultCount.textContent = "";

    emptyMessage.textContent =
      `Unable to load products: ${error.message}`;

    emptyMessage.style.display = "block";

    return;
  }

  products = data || [];

  displayLowStockItems();
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

  loadProducts();
}

exportExcelButton.addEventListener("click", exportExcel);
exportPdfButton.addEventListener("click", exportPdf);
logoutButton.addEventListener("click", logout);

initialisePage();