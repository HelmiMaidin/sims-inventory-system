const SUPABASE_URL = "https://ocycijajjkqfsrcnpbmn.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_EDDbsmJyHARgnhGsQ_dcjA_HHItlr8T";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

let currentUser = null;
let restockLists = [];
let selectedListIds = new Set();

const adminName =
  document.getElementById("adminName");

const sidebarAdminName =
  document.getElementById("sidebarAdminName");

const adminAvatar =
  document.getElementById("adminAvatar");

const sidebarAdminAvatar =
  document.getElementById("sidebarAdminAvatar");

const logoutButton =
  document.getElementById("logoutButton");

const folderItemCount =
  document.getElementById("folderItemCount");

const resultCount =
  document.getElementById("resultCount");

const deleteSelectedButton =
  document.getElementById("deleteSelectedButton");

const searchInput =
  document.getElementById("searchInput");

const dateFilter =
  document.getElementById("dateFilter");

const clearFiltersButton =
  document.getElementById("clearFiltersButton");

const message =
  document.getElementById("message");

const restockListTableBody =
  document.getElementById("restockListTableBody");

const selectAllCheckbox =
  document.getElementById("selectAllCheckbox");

const emptyMessage =
  document.getElementById("emptyMessage");

const restockDetailsModal =
  document.getElementById("restockDetailsModal");

const closeModalButton =
  document.getElementById("closeModalButton");

const modalTitle =
  document.getElementById("modalTitle");

const modalDetails =
  document.getElementById("modalDetails");

const restockItemTableBody =
  document.getElementById("restockItemTableBody");

const modalItemCount =
  document.getElementById("modalItemCount");

const modalTotalPrice =
  document.getElementById("modalTotalPrice");

function escapeHtml(value) {
  return String(value ?? "-")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatMoney(value) {
  return `RM ${Number(value || 0).toFixed(2)}`;
}

function formatDateTime(dateValue) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("en-MY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getLocalDateStamp(dateValue) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function showMessage(text, type) {
  message.textContent = text;
  message.className = `message ${type}`;

  setTimeout(function () {
    message.textContent = "";
    message.className = "message";
  }, 4500);
}

function getVisibleRestockLists() {
  const keyword =
    searchInput.value.trim().toLowerCase();

  const selectedDate = dateFilter.value;

  return restockLists.filter(function (restockList) {
    const searchableText = [
      restockList.list_name,
      restockList.saved_by_name
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      !keyword || searchableText.includes(keyword);

    const matchesDate =
      !selectedDate ||
      getLocalDateStamp(restockList.saved_at) === selectedDate;

    return matchesSearch && matchesDate;
  });
}

function updateSelectionSummary() {
  const visibleLists = getVisibleRestockLists();

  const selectedVisibleCount =
    visibleLists.filter(function (restockList) {
      return selectedListIds.has(String(restockList.id));
    }).length;

  const selectedCount = selectedListIds.size;

  resultCount.textContent =
    `${visibleLists.length} saved list(s) shown · ` +
    `${selectedCount} selected`;

  folderItemCount.textContent =
    `${restockLists.length} saved list(s)`;

  deleteSelectedButton.disabled = selectedCount === 0;

  selectAllCheckbox.checked =
    visibleLists.length > 0 &&
    selectedVisibleCount === visibleLists.length;

  selectAllCheckbox.indeterminate =
    selectedVisibleCount > 0 &&
    selectedVisibleCount < visibleLists.length;
}

function displayRestockLists() {
  const visibleLists = getVisibleRestockLists();

  restockListTableBody.innerHTML = "";

  const validIds = new Set(
    restockLists.map(function (restockList) {
      return String(restockList.id);
    })
  );

  selectedListIds.forEach(function (listId) {
    if (!validIds.has(listId)) {
      selectedListIds.delete(listId);
    }
  });

  if (visibleLists.length === 0) {
    emptyMessage.style.display = "block";

    if (restockLists.length === 0) {
      emptyMessage.textContent =
        "No saved restock lists yet. " +
        "Save a selected low-stock list to create the first record.";
    } else {
      emptyMessage.textContent =
        "No saved restock lists match your filters.";
    }

    updateSelectionSummary();
    return;
  }

  emptyMessage.style.display = "none";

  visibleLists.forEach(function (restockList) {
    const listId = String(restockList.id);

    const isSelected =
      selectedListIds.has(listId);

    restockListTableBody.innerHTML += `
      <tr>
        <td>
          <div class="file-name">
            ${escapeHtml(restockList.list_name)}
          </div>

          <div class="file-meta">
            Restock purchase list
          </div>
        </td>

        <td>
          ${escapeHtml(restockList.saved_by_name || "Unknown User")}
        </td>

        <td>
          ${escapeHtml(formatDateTime(restockList.saved_at))}
        </td>

        <td>
          ${Number(restockList.total_items || 0)}
        </td>

        <td>
          ${formatMoney(restockList.estimated_total)}
        </td>

        <td>
          <button
            class="table-button open-button"
            type="button"
            data-open-list-id="${escapeHtml(listId)}"
          >
            Open
          </button>
        </td>

        <td>
          <button
            class="table-button pdf-button"
            type="button"
            data-pdf-list-id="${escapeHtml(listId)}"
          >
            PDF
          </button>
        </td>

        <td class="select-column">
          <input
            class="list-select-checkbox"
            data-list-id="${escapeHtml(listId)}"
            type="checkbox"
            aria-label="Select ${escapeHtml(restockList.list_name)}"
            ${isSelected ? "checked" : ""}
          >
        </td>
      </tr>
    `;
  });

  updateSelectionSummary();
}

async function loadRestockLists() {
  const { data, error } = await supabaseClient
    .from("restock_lists")
    .select(`
      id,
      list_name,
      saved_by,
      saved_by_name,
      saved_at,
      total_items,
      estimated_total
    `)
    .order("saved_at", { ascending: false });

  if (error) {
    restockLists = [];

    emptyMessage.textContent =
      `Unable to load saved lists: ${error.message}`;

    emptyMessage.style.display = "block";

    showMessage(
      "SIMS could not load the saved restock lists.",
      "error"
    );

    updateSelectionSummary();
    return;
  }

  restockLists = data || [];

  displayRestockLists();
}

function getRestockListById(listId) {
  return restockLists.find(function (restockList) {
    return String(restockList.id) === String(listId);
  });
}

async function getRestockListItems(listId) {
  const { data, error } = await supabaseClient
    .from("restock_list_items")
    .select(`
      id,
      restock_list_id,
      product_id,
      barcode,
      category,
      product_name,
      unit,
      minimum_quantity,
      current_quantity,
      quantity_needed,
      unit_price,
      total_price
    `)
    .eq("restock_list_id", listId)
    .order("category", { ascending: true })
    .order("product_name", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

async function openRestockList(listId) {
  const restockList = getRestockListById(listId);

  if (!restockList) {
    showMessage("The selected list could not be found.", "error");
    return;
  }

  modalTitle.textContent = restockList.list_name;

  modalDetails.innerHTML = `
    <div class="modal-detail-box">
      <span>Saved By</span>
      <strong>
        ${escapeHtml(restockList.saved_by_name || "Unknown User")}
      </strong>
    </div>

    <div class="modal-detail-box">
      <span>Saved Date & Time</span>
      <strong>
        ${escapeHtml(formatDateTime(restockList.saved_at))}
      </strong>
    </div>

    <div class="modal-detail-box">
      <span>Estimated Total</span>
      <strong>
        ${formatMoney(restockList.estimated_total)}
      </strong>
    </div>
  `;

  restockItemTableBody.innerHTML = `
    <tr>
      <td colspan="9">Loading saved products...</td>
    </tr>
  `;

  modalItemCount.textContent = "0 item(s)";
  modalTotalPrice.textContent = "RM 0.00";

  restockDetailsModal.classList.add("show-modal");

  try {
    const items = await getRestockListItems(listId);

    restockItemTableBody.innerHTML = "";

    if (items.length === 0) {
      restockItemTableBody.innerHTML = `
        <tr>
          <td colspan="9">
            No saved product details were found in this list.
          </td>
        </tr>
      `;
    } else {
      items.forEach(function (item) {
        restockItemTableBody.innerHTML += `
          <tr>
            <td>${escapeHtml(item.barcode)}</td>
            <td>${escapeHtml(item.category)}</td>
            <td>${escapeHtml(item.product_name)}</td>
            <td>${escapeHtml(item.unit)}</td>
            <td>${Number(item.minimum_quantity || 0)}</td>
            <td>${Number(item.current_quantity || 0)}</td>
            <td>${Number(item.quantity_needed || 0)}</td>
            <td>${Number(item.unit_price || 0).toFixed(2)}</td>
            <td>${Number(item.total_price || 0).toFixed(2)}</td>
          </tr>
        `;
      });
    }

    const calculatedTotal = items.reduce(
      function (total, item) {
        return total + Number(item.total_price || 0);
      },
      0
    );

    modalItemCount.textContent =
      `${items.length} item(s)`;

    modalTotalPrice.textContent =
      formatMoney(calculatedTotal);
  } catch (error) {
    restockItemTableBody.innerHTML = `
      <tr>
        <td colspan="9">
          Unable to load saved products:
          ${escapeHtml(error.message)}
        </td>
      </tr>
    `;
  }
}

function closeRestockDetailsModal() {
  restockDetailsModal.classList.remove("show-modal");
}

async function logout() {
  if (!confirm("Are you sure you want to logout?")) {
    return;
  }

  await supabaseClient.auth.signOut();

  localStorage.removeItem("currentUser");

  window.location.href = "login.html";
}

function createPdfTableRows(items) {
    return items.map(function (item) {
      return `
        <tr>
          <td>${escapeHtml(item.barcode)}</td>
          <td>${escapeHtml(item.category)}</td>
          <td>${escapeHtml(item.product_name)}</td>
          <td>${escapeHtml(item.unit)}</td>
          <td>${Number(item.minimum_quantity || 0)}</td>
          <td>${Number(item.current_quantity || 0)}</td>
          <td>${Number(item.quantity_needed || 0)}</td>
          <td>${Number(item.unit_price || 0).toFixed(2)}</td>
          <td>${Number(item.total_price || 0).toFixed(2)}</td>
        </tr>
      `;
    }).join("");
  }
  
  function createPdfTable(items) {
    return `
      <table>
        <thead>
          <tr>
            <th>Barcode</th>
            <th>Category</th>
            <th>Product</th>
            <th>Unit</th>
            <th>Minimum</th>
            <th>Current</th>
            <th>Needed</th>
            <th>Unit Price</th>
            <th>Total</th>
          </tr>
        </thead>
  
        <tbody>
          ${createPdfTableRows(items)}
        </tbody>
      </table>
    `;
  }
  
  async function downloadRestockListPdf(listId) {
    const restockList = getRestockListById(listId);
  
    if (!restockList) {
      showMessage("The selected list could not be found.", "error");
      return;
    }
  
    let items = [];
  
    try {
      items = await getRestockListItems(listId);
    } catch (error) {
      showMessage(
        `Unable to load saved products: ${error.message}`,
        "error"
      );
  
      return;
    }
  
    if (items.length === 0) {
      showMessage(
        "This saved list does not contain any products.",
        "error"
      );
  
      return;
    }
  
    const totalCost = items.reduce(
      function (total, item) {
        return total + Number(item.total_price || 0);
      },
      0
    );
  
    const rowsPerPage = 35;
    const pageGroups = [];
  
    for (
      let startIndex = 0;
      startIndex < items.length;
      startIndex += rowsPerPage
    ) {
      pageGroups.push(
        items.slice(startIndex, startIndex + rowsPerPage)
      );
    }
  
    const printablePages = pageGroups.map(
      function (pageItems, pageIndex) {
        const isFirstPage = pageIndex === 0;
  
        const isLastPage =
          pageIndex === pageGroups.length - 1;
  
        return `
          <section class="pdf-page">
            <div class="page-heading">
              <span>${escapeHtml(restockList.list_name)}</span>
  
              <span>
                ${escapeHtml(formatDateTime(restockList.saved_at))}
              </span>
            </div>
  
            ${
              isFirstPage
                ? `
                  <div class="report-header">
                    <h1>${escapeHtml(restockList.list_name)}</h1>
  
                    <p>
                      Saved by:
                      ${escapeHtml(
                        restockList.saved_by_name || "Unknown User"
                      )}
                    </p>
  
                    <p>
                      Saved date:
                      ${escapeHtml(formatDateTime(restockList.saved_at))}
                    </p>
                  </div>
                `
                : ""
            }
  
            ${createPdfTable(pageItems)}
  
            ${
              isLastPage
                ? `
                  <div class="report-summary">
                    <p>
                      <strong>Total Items Selected:</strong>
                      ${items.length}
                    </p>
  
                    <p>
                      <strong>Estimated Total:</strong>
                      ${formatMoney(totalCost)}
                    </p>
                  </div>
                `
                : ""
            }
          </section>
        `;
      }
    ).join("");
  
    const printWindow = window.open("", "_blank");
  
    if (!printWindow) {
      alert(
        "Your browser blocked the print window. " +
        "Please allow pop-ups and try again."
      );
  
      return;
    }
  
    printWindow.document.write(`
      <!doctype html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
  
        <title>${escapeHtml(restockList.list_name)}</title>
  
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
  
          * {
            box-sizing: border-box;
          }
  
          body {
            margin: 0;
            color: #24153d;
            font-family: Arial, sans-serif;
            background: white;
          }
  
          .pdf-page {
            min-height: 270mm;
            page-break-after: always;
          }
  
          .pdf-page:last-child {
            page-break-after: auto;
          }
  
          .page-heading {
            display: flex;
            justify-content: space-between;
            gap: 15px;
            padding-bottom: 8px;
            margin-bottom: 12px;
            color: #6d28d9;
            font-size: 10px;
            font-weight: bold;
            border-bottom: 2px solid #ddd6fe;
          }
  
          .report-header {
            margin-bottom: 14px;
          }
  
          h1 {
            margin: 0 0 7px;
            color: #6d28d9;
            font-size: 23px;
          }
  
          p {
            margin: 4px 0;
            color: #4b5563;
            font-size: 11px;
          }
  
          table {
            width: 100%;
            table-layout: fixed;
            border-collapse: collapse;
          }
  
          th,
          td {
            padding: 5px 4px;
            overflow-wrap: break-word;
            font-size: 7px;
            line-height: 1.2;
            text-align: left;
            vertical-align: top;
            border: 1px solid #8b92a1;
          }
  
          th {
            color: white;
            font-weight: bold;
            background: #6d28d9;
          }
  
          tbody tr:nth-child(even) {
            background: #f5f3ff;
          }
  
          .report-summary {
            padding: 12px 15px;
            margin-top: 18px;
            background: #f5f3ff;
            border-left: 5px solid #7c3aed;
          }
  
          .report-summary p {
            margin: 7px 0;
            color: #4c1d95;
            font-size: 13px;
          }
  
          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
      </head>
  
      <body>
        ${printablePages}
      </body>
      </html>
    `);
  
    printWindow.document.close();
  
    printWindow.onload = function () {
      printWindow.focus();
      printWindow.print();
    };
  }
  
  async function deleteSelectedLists() {
    const selectedIds = Array.from(selectedListIds);
  
    if (selectedIds.length === 0) {
      return;
    }
  
    const isConfirmed = confirm(
      `Delete ${selectedIds.length} selected saved list(s)?\n\n` +
      "This will permanently remove the saved list " +
      "and all product snapshots inside it."
    );
  
    if (!isConfirmed) {
      return;
    }
  
    deleteSelectedButton.disabled = true;
    deleteSelectedButton.textContent = "Deleting...";
  
    const { error } = await supabaseClient
      .from("restock_lists")
      .delete()
      .in("id", selectedIds);
  
    deleteSelectedButton.textContent =
      "Delete Selected Lists";
  
    if (error) {
      showMessage(
        `Unable to delete selected lists: ${error.message}`,
        "error"
      );
  
      updateSelectionSummary();
      return;
    }
  
    selectedListIds.clear();
  
    showMessage(
      `${selectedIds.length} saved list(s) deleted successfully.`,
      "success"
    );
  
    await loadRestockLists();
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
      displayName.charAt(0).toUpperCase() || "A";
  
    adminName.textContent = displayName;
    sidebarAdminName.textContent = displayName;
    adminAvatar.textContent = firstLetter;
    sidebarAdminAvatar.textContent = firstLetter;
  
    await loadRestockLists();
  }
  
  selectAllCheckbox.addEventListener("change", function () {
    const visibleLists = getVisibleRestockLists();
  
    if (selectAllCheckbox.checked) {
      visibleLists.forEach(function (restockList) {
        selectedListIds.add(String(restockList.id));
      });
    } else {
      visibleLists.forEach(function (restockList) {
        selectedListIds.delete(String(restockList.id));
      });
    }
  
    displayRestockLists();
  });
  
  restockListTableBody.addEventListener(
    "change",
    function (event) {
      const checkbox = event.target.closest(
        ".list-select-checkbox"
      );
  
      if (!checkbox) {
        return;
      }
  
      const listId = checkbox.dataset.listId;
  
      if (checkbox.checked) {
        selectedListIds.add(listId);
      } else {
        selectedListIds.delete(listId);
      }
  
      updateSelectionSummary();
    }
  );
  
  restockListTableBody.addEventListener(
    "click",
    function (event) {
      const openButton = event.target.closest(
        "[data-open-list-id]"
      );
  
      const pdfButton = event.target.closest(
        "[data-pdf-list-id]"
      );
  
      if (openButton) {
        openRestockList(openButton.dataset.openListId);
        return;
      }
  
      if (pdfButton) {
        downloadRestockListPdf(pdfButton.dataset.pdfListId);
      }
    }
  );
  
  searchInput.addEventListener("input", displayRestockLists);
  
  dateFilter.addEventListener("change", displayRestockLists);
  
  clearFiltersButton.addEventListener("click", function () {
    searchInput.value = "";
    dateFilter.value = "";
  
    displayRestockLists();
  });
  
  deleteSelectedButton.addEventListener(
    "click",
    deleteSelectedLists
  );
  
  closeModalButton.addEventListener(
    "click",
    closeRestockDetailsModal
  );
  
  restockDetailsModal.addEventListener(
    "click",
    function (event) {
      if (event.target.dataset.closeModal === "true") {
        closeRestockDetailsModal();
      }
    }
  );
  
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeRestockDetailsModal();
    }
  });
  
  logoutButton.addEventListener("click", logout);
  
  initialisePage();
