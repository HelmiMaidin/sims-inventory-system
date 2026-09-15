const SUPABASE_URL = "https://ocycijajjkqfsrcnpbmn.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_EDDbsmJyHARgnhGsQ_dcjA_HHItlr8T";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

let currentUser = null;
let products = [];
let selectedProductIds = new Set();
let searchTerm = "";

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

const selectAllCheckbox =
  document.getElementById("selectAllCheckbox");

const lowStockSearch =
  document.getElementById("lowStockSearch");

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
        (
          stock === 0 ||
          (stock > 0 && stock < minimumStock)
        )
      );
    })
    .sort(function (firstProduct, secondProduct) {
      return String(firstProduct.name || "")
        .localeCompare(
          String(secondProduct.name || ""),
          undefined,
          { sensitivity: "base" }
        );
    });
}

function getVisibleLowStockItems() {
  const keyword = searchTerm.trim().toLowerCase();

  if (!keyword) {
    return getLowStockItems();
  }

  return getLowStockItems().filter(function (product) {
    const searchableText = [
      product.barcode,
      product.category,
      product.name
    ]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(keyword);
  });
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

function getSelectedLowStockItems() {
  return getLowStockItems().filter(function (product) {
    return selectedProductIds.has(String(product.id));
  });
}

function updateSelectionSummary() {
  const allLowStockItems = getLowStockItems();
  const visibleItems = getVisibleLowStockItems();

  const selectedCount =
    getSelectedLowStockItems().length;

  const selectedVisibleCount =
    visibleItems.filter(function (product) {
      return selectedProductIds.has(String(product.id));
    }).length;

  resultCount.textContent =
    `${allLowStockItems.length} item(s) require restocking · ` +
    `${selectedCount} selected`;

  selectAllCheckbox.checked =
    visibleItems.length > 0 &&
    selectedVisibleCount === visibleItems.length;

  selectAllCheckbox.indeterminate =
    selectedVisibleCount > 0 &&
    selectedVisibleCount < visibleItems.length;
}

function displayLowStockItems() {
  const allLowStockItems = getLowStockItems();
  const visibleItems = getVisibleLowStockItems();

  lowStockTableBody.innerHTML = "";

  const validIds = new Set(
    allLowStockItems.map(function (product) {
      return String(product.id);
    })
  );

  selectedProductIds.forEach(function (productId) {
    if (!validIds.has(productId)) {
      selectedProductIds.delete(productId);
    }
  });

  if (allLowStockItems.length === 0) {
    emptyMessage.textContent =
      "No low-stock or out-of-stock items found.";

    emptyMessage.style.display = "block";

    selectAllCheckbox.checked = false;
    selectAllCheckbox.indeterminate = false;

    resultCount.textContent =
      "0 item(s) require restocking · 0 selected";

    return;
  }

  if (visibleItems.length === 0) {
    emptyMessage.textContent =
      "No matching low-stock products found.";

    emptyMessage.style.display = "block";

    updateSelectionSummary();

    return;
  }

  emptyMessage.style.display = "none";

  visibleItems.forEach(function (product) {
    const productId = String(product.id);

    const isSelected =
      selectedProductIds.has(productId);

    lowStockTableBody.innerHTML += `
      <tr>
        <td>${escapeHtml(product.barcode)}</td>
        <td>${escapeHtml(product.category)}</td>
        <td>${escapeHtml(product.name)}</td>
        <td>${escapeHtml(product.unit)}</td>
        <td>${Number(product.minimum_stock || 0)}</td>
        <td>${Number(product.stock || 0)}</td>
        <td>${getRestockQuantity(product)}</td>
        <td>${Number(product.price || 0).toFixed(2)}</td>
        <td>${getRestockCost(product).toFixed(2)}</td>

        <td class="select-column">
          <input
            class="product-select-checkbox"
            data-product-id="${escapeHtml(productId)}"
            type="checkbox"
            aria-label="Select ${escapeHtml(product.name)}"
            ${isSelected ? "checked" : ""}
          >
        </td>
      </tr>
    `;
  });

  updateSelectionSummary();
}

function getProductsToExport() {
  const selectedItems = getSelectedLowStockItems();

  if (selectedItems.length === 0) {
    alert(
      "Please select at least one product before exporting the report."
    );

    return null;
  }

  return selectedItems;
}

function downloadCsvReport(selectedItems) {
  let csvContent =
    "\uFEFFSIMS Selected Restock Report\n";

  csvContent +=
    `Generated,${new Date().toLocaleString()}\n`;

  csvContent +=
    `Prepared By,${currentUser.name}\n\n`;

  csvContent +=
    "Barcode,Category,Product,Unit,Minimum Quantity,Current Quantity,Quantity Needed,Unit Price (RM),Total (RM)\n";

  selectedItems.forEach(function (product) {
    csvContent +=
      `"${product.barcode || "-"}",` +
      `"${product.category || "-"}",` +
      `"${product.name || "-"}",` +
      `"${product.unit || "-"}",` +
      `"${Number(product.minimum_stock || 0)}",` +
      `"${Number(product.stock || 0)}",` +
      `"${getRestockQuantity(product)}",` +
      `"${Number(product.price || 0).toFixed(2)}",` +
      `"${getRestockCost(product).toFixed(2)}"\n`;
  });

  const totalRestockCost = selectedItems.reduce(
    function (total, product) {
      return total + getRestockCost(product);
    },
    0
  );

  csvContent += "\n";

  csvContent +=
    `Total Selected Products,${selectedItems.length}\n`;

  csvContent +=
    `Total Restock Amount (RM),${totalRestockCost.toFixed(2)}\n`;

  const file = new Blob(
    [csvContent],
    { type: "text/csv;charset=utf-8;" }
  );

  const link = document.createElement("a");

  link.href = URL.createObjectURL(file);

  link.download =
    `SIMS_Selected_Restock_Report_${
      new Date().toISOString().slice(0, 10)
    }.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(function () {
    URL.revokeObjectURL(link.href);
  }, 1000);
}

function exportExcel() {
  const selectedItems = getProductsToExport();

  if (!selectedItems) {
    return;
  }

  if (typeof XLSX === "undefined") {
    downloadCsvReport(selectedItems);

    alert(
      "A CSV report was downloaded because the Excel design library could not load."
    );

    return;
  }

  try {
    const totalRestockCost = selectedItems.reduce(
      function (total, product) {
        return total + getRestockCost(product);
      },
      0
    );

    const worksheetData = [
      ["SIMS SELECTED RESTOCK REPORT"],
      ["Selected Low Stock Items"],
      ["Generated:", new Date().toLocaleString()],
      ["Prepared by:", currentUser.name],
      [],
      [
        "Barcode",
        "Category",
        "Product",
        "Unit",
        "Minimum Quantity",
        "Current Quantity",
        "Quantity Needed",
        "Unit Price (RM)",
        "Total (RM)"
      ]
    ];

    selectedItems.forEach(function (product) {
      worksheetData.push([
        product.barcode || "-",
        product.category || "-",
        product.name || "-",
        product.unit || "-",
        Number(product.minimum_stock || 0),
        Number(product.stock || 0),
        getRestockQuantity(product),
        Number(product.price || 0),
        getRestockCost(product)
      ]);
    });

    worksheetData.push([]);

    worksheetData.push([
      "TOTAL SELECTED PRODUCTS",
      selectedItems.length
    ]);

    worksheetData.push([
      "TOTAL RESTOCK AMOUNT (RM)",
      totalRestockCost
    ]);

    const worksheet =
      XLSX.utils.aoa_to_sheet(worksheetData);

    worksheet["!merges"] = [
      {
        s: { r: 0, c: 0 },
        e: { r: 0, c: 8 }
      },
      {
        s: { r: 1, c: 0 },
        e: { r: 1, c: 8 }
      }
    ];

    worksheet["!cols"] = [
      { wch: 18 },
      { wch: 18 },
      { wch: 28 },
      { wch: 12 },
      { wch: 18 },
      { wch: 18 },
      { wch: 17 },
      { wch: 17 },
      { wch: 16 }
    ];

    worksheet["!autofilter"] = {
      ref: `A6:I${6 + selectedItems.length}`
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

    for (let column = 0; column <= 8; column++) {
      const cell = XLSX.utils.encode_cell({
        r: 5,
        c: column
      });

      worksheet[cell].s = headerStyle;
    }

    selectedItems.forEach(function (product, index) {
      const row = 6 + index;

      const rowStyle = index % 2 === 0
        ? normalRowStyle
        : alternateRowStyle;

      for (let column = 0; column <= 8; column++) {
        const cell = XLSX.utils.encode_cell({
          r: row,
          c: column
        });

        worksheet[cell].s = rowStyle;
      }

      const unitPriceCell =
        XLSX.utils.encode_cell({ r: row, c: 7 });

      const totalCell =
        XLSX.utils.encode_cell({ r: row, c: 8 });

      worksheet[unitPriceCell].z = "#,##0.00";
      worksheet[totalCell].z = "#,##0.00";
    });

    const totalProductsRow =
      8 + selectedItems.length;

    const totalCostRow =
      9 + selectedItems.length;

    worksheet[`A${totalProductsRow}`].s =
      summaryLabelStyle;

    worksheet[`B${totalProductsRow}`].s =
      summaryValueStyle;

    worksheet[`A${totalCostRow}`].s =
      summaryLabelStyle;

    worksheet[`B${totalCostRow}`].s =
      summaryValueStyle;

    worksheet[`B${totalCostRow}`].z = "#,##0.00";

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Selected Restock Report"
    );

    XLSX.writeFile(
      workbook,
      `SIMS_Selected_Restock_Report_${
        new Date().toISOString().slice(0, 10)
      }.xlsx`
    );
  } catch (error) {
    downloadCsvReport(selectedItems);

    alert(
      "The styled Excel report could not be created, so SIMS downloaded a CSV report instead."
    );
  }
}

function exportPdf() {
  const selectedItems = getProductsToExport();

  if (!selectedItems) {
    return;
  }

  const totalRestockCost = selectedItems.reduce(
    function (total, product) {
      return total + getRestockCost(product);
    },
    0
  );

  let tableRows = "";

  selectedItems.forEach(function (product) {
    tableRows += `
      <tr>
        <td>${escapeHtml(product.barcode)}</td>
        <td>${escapeHtml(product.category)}</td>
        <td>${escapeHtml(product.name)}</td>
        <td>${escapeHtml(product.unit)}</td>
        <td>${Number(product.minimum_stock || 0)}</td>
        <td>${Number(product.stock || 0)}</td>
        <td>${getRestockQuantity(product)}</td>
        <td>${Number(product.price || 0).toFixed(2)}</td>
        <td>${getRestockCost(product).toFixed(2)}</td>
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
      <title>SIMS Selected Restock Report</title>

      <style>
        @page {
          size: A4 landscape;
          margin: 12mm;
        }

        body {
          margin: 0;
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
      </style>
    </head>

    <body>
      <h1>SIMS Selected Restock Report</h1>

      <p>Generated: ${new Date().toLocaleString()}</p>
      <p>Prepared by: ${escapeHtml(currentUser.name)}</p>

      <div class="summary">
        <strong>Total selected products:</strong>
        ${selectedItems.length}
        <br>

        <strong>Total restock amount:</strong>
        RM ${totalRestockCost.toFixed(2)}
      </div>

      <table>
        <thead>
          <tr>
            <th>Barcode</th>
            <th>Category</th>
            <th>Product</th>
            <th>Unit</th>
            <th>Minimum Quantity</th>
            <th>Current Quantity</th>
            <th>Quantity Needed</th>
            <th>Unit Price (RM)</th>
            <th>Total (RM)</th>
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

  const firstLetter =
    displayName.charAt(0).toUpperCase();

  supervisorName.textContent = displayName;
  sidebarSupervisorName.textContent = displayName;

  supervisorAvatar.textContent = firstLetter;
  sidebarSupervisorAvatar.textContent = firstLetter;

  loadProducts();
}

selectAllCheckbox.addEventListener("change", function () {
  const visibleItems = getVisibleLowStockItems();

  if (selectAllCheckbox.checked) {
    visibleItems.forEach(function (product) {
      selectedProductIds.add(String(product.id));
    });
  } else {
    visibleItems.forEach(function (product) {
      selectedProductIds.delete(String(product.id));
    });
  }

  displayLowStockItems();
});

lowStockTableBody.addEventListener("change", function (event) {
  const checkbox = event.target.closest(
    ".product-select-checkbox"
  );

  if (!checkbox) {
    return;
  }

  const productId = checkbox.dataset.productId;

  if (checkbox.checked) {
    selectedProductIds.add(productId);
  } else {
    selectedProductIds.delete(productId);
  }

  updateSelectionSummary();
});

lowStockSearch.addEventListener("input", function () {
  searchTerm = lowStockSearch.value;
  displayLowStockItems();
});

exportExcelButton.addEventListener("click", exportExcel);
exportPdfButton.addEventListener("click", exportPdf);
logoutButton.addEventListener("click", logout);

initialisePage();
