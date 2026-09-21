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

let sortKey = "";
let sortDirection = "asc";

const supervisorName = document.getElementById("supervisorName");
const sidebarSupervisorName = document.getElementById(
  "sidebarSupervisorName"
);

const supervisorAvatar = document.getElementById(
  "supervisorAvatar"
);

const sidebarSupervisorAvatar = document.getElementById(
  "sidebarSupervisorAvatar"
);

const logoutButton = document.getElementById("logoutButton");
const lowStockSearch = document.getElementById("lowStockSearch");
const lowStockTableBody = document.getElementById("lowStockTableBody");
const resultCount = document.getElementById("resultCount");
const emptyMessage = document.getElementById("emptyMessage");

const selectedQuantityTotal = document.getElementById(
  "selectedQuantityTotal"
);

const selectedPriceTotal = document.getElementById(
  "selectedPriceTotal"
);

const selectAllCheckbox = document.getElementById(
  "selectAllCheckbox"
);

const saveSelectedListButton = document.getElementById(
  "saveSelectedListButton"
);

const exportExcelButton = document.getElementById(
  "exportExcelButton"
);

const exportPdfButton = document.getElementById(
  "exportPdfButton"
);

const saveChoiceModal = document.getElementById(
  "saveChoiceModal"
);

const cancelSaveButton = document.getElementById(
  "cancelSaveButton"
);

const saveNewButton = document.getElementById(
  "saveNewButton"
);

const overwriteSaveButton = document.getElementById(
  "overwriteSaveButton"
);

const sortableHeaders = document.querySelectorAll(
  "[data-sort-key]"
);

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getStock(product) {
  return Number(product.stock || 0);
}

function getMinimumStock(product) {
  return Number(product.minimum_stock || 0);
}

function getPrice(product) {
  return Number(product.price || 0);
}

function getQuantityNeeded(product) {
  return Math.max(
    getMinimumStock(product) - getStock(product),
    0
  );
}

function getTotalPrice(product) {
  return getQuantityNeeded(product) * getPrice(product);
}

function getTodayListName() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day} @ Restock List`;
}

function getLowStockProducts() {
  const searchText = lowStockSearch.value
    .trim()
    .toLowerCase();

  const filteredProducts = products.filter(function (product) {
    const stock = getStock(product);
    const minimumStock = getMinimumStock(product);

    const isLowStock =
      stock === 0 ||
      (stock > 0 && stock < minimumStock);

    const searchableText = [
      product.barcode,
      product.category,
      product.name
    ]
      .join(" ")
      .toLowerCase();

    return isLowStock && searchableText.includes(searchText);
  });

  if (!sortKey) {
    return filteredProducts;
  }

  return filteredProducts.sort(function (firstProduct, secondProduct) {
    const firstValue = String(
      firstProduct[sortKey] || ""
    ).toLowerCase();

    const secondValue = String(
      secondProduct[sortKey] || ""
    ).toLowerCase();

    const comparison = firstValue.localeCompare(
      secondValue,
      undefined,
      { sensitivity: "base" }
    );

    return sortDirection === "asc"
      ? comparison
      : -comparison;
  });
}

function getSelectedProducts() {
  return products.filter(function (product) {
    return selectedProductIds.has(String(product.id));
  });
}

function updateSortHeaderLabels() {
  sortableHeaders.forEach(function (header) {
    const key = header.dataset.sortKey;

    if (key === "category") {
      header.textContent =
        sortKey === "category"
          ? `Category ${sortDirection === "asc" ? "↑" : "↓"}`
          : "Category ↕";
    }

    if (key === "name") {
      header.textContent =
        sortKey === "name"
          ? `Product ${sortDirection === "asc" ? "↑" : "↓"}`
          : "Product ↕";
    }
  });
}

function updateSelectionSummary() {
  const selectedProducts = getSelectedProducts();

  const selectedTotal = selectedProducts.reduce(
    function (total, product) {
      return total + getTotalPrice(product);
    },
    0
  );

  selectedQuantityTotal.textContent =
    selectedProducts.length;

  selectedPriceTotal.textContent =
    `RM ${selectedTotal.toFixed(2)}`;

  const visibleProducts = getLowStockProducts();

  const everyVisibleProductSelected =
    visibleProducts.length > 0 &&
    visibleProducts.every(function (product) {
      return selectedProductIds.has(String(product.id));
    });

  selectAllCheckbox.checked = everyVisibleProductSelected;

  selectAllCheckbox.indeterminate =
    !everyVisibleProductSelected &&
    visibleProducts.some(function (product) {
      return selectedProductIds.has(String(product.id));
    });

  resultCount.textContent =
    `${visibleProducts.length} item(s) require restocking · ` +
    `${selectedProducts.length} selected`;
}

function displayProducts() {
  const lowStockProducts = getLowStockProducts();

  lowStockTableBody.innerHTML = "";
  updateSortHeaderLabels();

  if (lowStockProducts.length === 0) {
    emptyMessage.style.display = "block";
    updateSelectionSummary();
    return;
  }

  emptyMessage.style.display = "none";

  lowStockProducts.forEach(function (product) {
    const productId = String(product.id);
    const quantityNeeded = getQuantityNeeded(product);
    const totalPrice = getTotalPrice(product);

    lowStockTableBody.innerHTML += `
      <tr>
        <td>${escapeHtml(product.barcode || "-")}</td>
        <td>${escapeHtml(product.category || "-")}</td>
        <td>${escapeHtml(product.name || "-")}</td>
        <td>${escapeHtml(product.unit || "-")}</td>
        <td>${getMinimumStock(product)}</td>
        <td>${getStock(product)}</td>
        <td>${quantityNeeded}</td>
        <td>${getPrice(product).toFixed(2)}</td>
        <td>${totalPrice.toFixed(2)}</td>
        <td class="select-column">
          <input
            class="product-checkbox"
            data-product-id="${escapeHtml(productId)}"
            type="checkbox"
            aria-label="Select ${escapeHtml(product.name)}"
            ${selectedProductIds.has(productId) ? "checked" : ""}
          >
        </td>
      </tr>
    `;
  });

  document
    .querySelectorAll(".product-checkbox")
    .forEach(function (checkbox) {
      checkbox.addEventListener("change", function () {
        const productId = checkbox.dataset.productId;

        if (checkbox.checked) {
          selectedProductIds.add(productId);
        } else {
          selectedProductIds.delete(productId);
        }

        updateSelectionSummary();
      });
    });

  updateSelectionSummary();
}

function chooseSaveAction() {
  return new Promise(function (resolve) {
    saveChoiceModal.hidden = false;

    function closeModal(choice) {
      saveChoiceModal.hidden = true;

      cancelSaveButton.removeEventListener(
        "click",
        cancelHandler
      );

      saveNewButton.removeEventListener(
        "click",
        saveNewHandler
      );

      overwriteSaveButton.removeEventListener(
        "click",
        overwriteHandler
      );

      resolve(choice);
    }

    function cancelHandler() {
      closeModal("cancel");
    }

    function saveNewHandler() {
      closeModal("new");
    }

    function overwriteHandler() {
      closeModal("overwrite");
    }

    cancelSaveButton.addEventListener(
      "click",
      cancelHandler
    );

    saveNewButton.addEventListener(
      "click",
      saveNewHandler
    );

    overwriteSaveButton.addEventListener(
      "click",
      overwriteHandler
    );
  });
}

function setSaveButtonState(isSaving) {
  saveSelectedListButton.disabled = isSaving;

  saveSelectedListButton.textContent = isSaving
    ? "Saving..."
    : "Save Selected List";
}

function getSelectedListTotals(selectedProducts) {
  const estimatedTotal = selectedProducts.reduce(
    function (total, product) {
      return total + getTotalPrice(product);
    },
    0
  );

  return {
    totalItems: selectedProducts.length,
    estimatedTotal: estimatedTotal
  };
}

async function saveSelectedList() {
  const selectedProducts = getSelectedProducts();

  if (selectedProducts.length === 0) {
    alert("Please select at least one low-stock product first.");
    return;
  }

  const listName = getTodayListName();

  setSaveButtonState(true);

  const { data: existingLists, error: existingError } =
    await supabaseClient
      .from("restock_lists")
      .select("id, list_name, saved_by")
      .eq("list_name", listName)
      .eq("saved_by", currentUser.id)
      .order("saved_at", { ascending: false });

  if (existingError) {
    setSaveButtonState(false);

    alert(
      `Unable to check existing saved lists: ${existingError.message}`
    );

    return;
  }

  let saveAction = "new";
  let existingList = null;

  if (existingLists && existingLists.length > 0) {
    existingList = existingLists[0];
    saveAction = await chooseSaveAction();

    if (saveAction === "cancel") {
      setSaveButtonState(false);
      return;
    }
  }

  const totals = getSelectedListTotals(selectedProducts);

  let restockListId = null;

  if (saveAction === "overwrite" && existingList) {
    const { error: updateError } = await supabaseClient
      .from("restock_lists")
      .update({
        saved_by_name: currentUser.name,
        saved_at: new Date().toISOString(),
        total_items: totals.totalItems,
        estimated_total: totals.estimatedTotal
      })
      .eq("id", existingList.id)
      .eq("saved_by", currentUser.id);

    if (updateError) {
      setSaveButtonState(false);

      alert(
        `Unable to update the previous list: ${updateError.message}`
      );

      return;
    }

    const { error: deleteItemsError } = await supabaseClient
      .from("restock_list_items")
      .delete()
      .eq("restock_list_id", existingList.id);

    if (deleteItemsError) {
      setSaveButtonState(false);

      alert(
        `The list was updated, but old products could not be replaced: ${deleteItemsError.message}`
      );

      return;
    }

    restockListId = existingList.id;
  } else {
    const { data: newList, error: insertListError } =
      await supabaseClient
        .from("restock_lists")
        .insert({
          list_name: listName,
          saved_by: currentUser.id,
          saved_by_name: currentUser.name,
          total_items: totals.totalItems,
          estimated_total: totals.estimatedTotal
        })
        .select("id")
        .single();

    if (insertListError) {
      setSaveButtonState(false);

      alert(
        `Unable to save the restock list: ${insertListError.message}`
      );

      return;
    }

    restockListId = newList.id;
  }

  const itemsToSave = selectedProducts.map(function (product) {
    return {
      restock_list_id: restockListId,
      product_id: product.id,
      barcode: product.barcode || "",
      category: product.category || "",
      product_name: product.name || "",
      unit: product.unit || "",
      minimum_quantity: getMinimumStock(product),
      current_quantity: getStock(product),
      quantity_needed: getQuantityNeeded(product),
      unit_price: getPrice(product),
      total_price: getTotalPrice(product)
    };
  });

  const { error: insertItemsError } = await supabaseClient
    .from("restock_list_items")
    .insert(itemsToSave);

  setSaveButtonState(false);

  if (insertItemsError) {
    alert(
      `The list was created, but products could not be saved: ${insertItemsError.message}`
    );

    return;
  }

  alert(
    saveAction === "overwrite"
      ? "Your restock list has been overwritten successfully."
      : "Your restock list has been saved successfully."
  );
}

function exportSelectedToExcel() {
  const selectedProducts = getSelectedProducts();

  if (selectedProducts.length === 0) {
    alert("Please select at least one low-stock product first.");
    return;
  }

  if (typeof XLSX === "undefined") {
    alert("Excel export is unavailable. Please check your internet connection.");
    return;
  }

  const workbook = XLSX.utils.book_new();

  const data = selectedProducts.map(function (product) {
    return {
      Barcode: product.barcode || "",
      Category: product.category || "",
      Product: product.name || "",
      Unit: product.unit || "",
      "Minimum Quantity": getMinimumStock(product),
      "Current Quantity": getStock(product),
      "Quantity Needed": getQuantityNeeded(product),
      "Unit Price (RM)": getPrice(product),
      "Total (RM)": getTotalPrice(product)
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);

  worksheet["!cols"] = [
    { wch: 18 },
    { wch: 18 },
    { wch: 28 },
    { wch: 12 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 }
  ];

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Restock List"
  );

  XLSX.writeFile(
    workbook,
    `${getTodayListName()}.xlsx`
  );
}

function createPrintRows(selectedProducts) {
  return selectedProducts
    .map(function (product) {
      return `
        <tr>
          <td>${escapeHtml(product.barcode || "-")}</td>
          <td>${escapeHtml(product.category || "-")}</td>
          <td>${escapeHtml(product.name || "-")}</td>
          <td>${escapeHtml(product.unit || "-")}</td>
          <td>${getMinimumStock(product)}</td>
          <td>${getStock(product)}</td>
          <td>${getQuantityNeeded(product)}</td>
          <td>${getPrice(product).toFixed(2)}</td>
          <td>${getTotalPrice(product).toFixed(2)}</td>
        </tr>
      `;
    })
    .join("");
}

function printSelectedPdf() {
  const selectedProducts = getSelectedProducts();

  if (selectedProducts.length === 0) {
    alert("Please select at least one low-stock product first.");
    return;
  }

  const totals = getSelectedListTotals(selectedProducts);
  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    alert(
      "Your browser blocked the print window. Please allow pop-ups and try again."
    );

    return;
  }

  const reportDate = new Date().toLocaleString();

  printWindow.document.write(`
    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${escapeHtml(getTodayListName())}</title>

      <style>
        @page {
          size: A4 portrait;
          margin: 12mm;
        }

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          color: #1f2937;
          font-family: Arial, sans-serif;
          font-size: 10px;
        }

        .report-header {
          margin-bottom: 14px;
        }

        h1 {
          margin: 0 0 8px;
          color: #b91c1c;
          font-size: 23px;
        }

        .report-header p {
          margin: 4px 0;
          color: #475569;
          font-size: 11px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 8px;
        }

        thead {
          display: table-header-group;
        }

        tr {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        th,
        td {
          padding: 6px 4px;
          overflow-wrap: anywhere;
          text-align: left;
          vertical-align: top;
          border: 1px solid #64748b;
        }

        th {
          color: white;
          font-weight: bold;
          background: #b91c1c;
        }

        tbody tr:nth-child(even) {
          background: #fff1f2;
        }

        th:nth-child(1),
        td:nth-child(1) {
          width: 12%;
        }

        th:nth-child(2),
        td:nth-child(2) {
          width: 11%;
        }

        th:nth-child(3),
        td:nth-child(3) {
          width: 16%;
        }

        th:nth-child(4),
        td:nth-child(4) {
          width: 8%;
        }

        th:nth-child(5),
        td:nth-child(5),
        th:nth-child(6),
        td:nth-child(6),
        th:nth-child(7),
        td:nth-child(7) {
          width: 11%;
        }

        th:nth-child(8),
        td:nth-child(8),
        th:nth-child(9),
        td:nth-child(9) {
          width: 10%;
        }

        .summary {
          margin-top: 16px;
          padding: 13px 16px;
          color: #7f1d1d;
          background: #fff1f2;
          border: 1px solid #fecaca;
          border-left: 6px solid #dc2626;
        }

        .summary p {
          margin: 5px 0;
          font-size: 13px;
          font-weight: bold;
        }
      </style>
    </head>

    <body>
      <header class="report-header">
        <h1>${escapeHtml(getTodayListName())}</h1>
        <p>Generated: ${escapeHtml(reportDate)}</p>
        <p>Prepared by: ${escapeHtml(currentUser.name)}</p>
      </header>

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
          ${createPrintRows(selectedProducts)}
        </tbody>
      </table>

      <section class="summary">
        <p>Total Items Selected: ${totals.totalItems}</p>
        <p>Estimated Total: RM ${totals.estimatedTotal.toFixed(2)}</p>
      </section>
    </body>
    </html>
  `);

  printWindow.document.close();

  printWindow.onload = function () {
    printWindow.focus();
    printWindow.print();
  };
}

async function loadProducts() {
  const { data, error } = await supabaseClient
    .from("products")
    .select(
      "id, barcode, name, category, unit, stock, minimum_stock, price, archived"
    )
    .eq("archived", false)
    .order("name", { ascending: true });

  if (error) {
    emptyMessage.textContent =
      `Unable to load low-stock items: ${error.message}`;

    emptyMessage.style.display = "block";
    return;
  }

  products = data || [];
  displayProducts();
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
    name: profile.full_name || profile.username || "Supervisor User",
    role: profile.role
  };

  localStorage.setItem(
    "currentUser",
    JSON.stringify(currentUser)
  );

  const initial =
    currentUser.name.charAt(0).toUpperCase() || "S";

  supervisorName.textContent = currentUser.name;
  sidebarSupervisorName.textContent = currentUser.name;
  supervisorAvatar.textContent = initial;
  sidebarSupervisorAvatar.textContent = initial;

  await loadProducts();
}

lowStockSearch.addEventListener("input", displayProducts);

selectAllCheckbox.addEventListener("change", function () {
  const visibleProducts = getLowStockProducts();

  visibleProducts.forEach(function (product) {
    const productId = String(product.id);

    if (selectAllCheckbox.checked) {
      selectedProductIds.add(productId);
    } else {
      selectedProductIds.delete(productId);
    }
  });

  displayProducts();
});

sortableHeaders.forEach(function (header) {
  function sortProducts() {
    const clickedKey = header.dataset.sortKey;

    if (sortKey === clickedKey) {
      sortDirection =
        sortDirection === "asc" ? "desc" : "asc";
    } else {
      sortKey = clickedKey;
      sortDirection = "asc";
    }

    displayProducts();
  }

  header.addEventListener("click", sortProducts);

  header.addEventListener("keydown", function (event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      sortProducts();
    }
  });
});

saveSelectedListButton.addEventListener(
  "click",
  saveSelectedList
);

exportExcelButton.addEventListener(
  "click",
  exportSelectedToExcel
);

exportPdfButton.addEventListener(
  "click",
  printSelectedPdf
);

logoutButton.addEventListener("click", logout);

initialisePage();
