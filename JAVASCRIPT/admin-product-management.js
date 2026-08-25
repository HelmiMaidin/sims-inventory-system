const SUPABASE_URL = "https://ocycijajjkqfsrcnpbmn.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_EDDbsmJyHARgnhGsQ_dcjA_HHItlr8T";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

let currentUser = null;
let products = [];

const adminName = document.getElementById("adminName");
const sidebarAdminName = document.getElementById("sidebarAdminName");

const adminAvatar = document.getElementById("adminAvatar");
const sidebarAdminAvatar =
  document.getElementById("sidebarAdminAvatar");

const logoutButton = document.getElementById("logoutButton");

const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");

const productTableBody =
  document.getElementById("productTableBody");

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

function formatDate(dateValue) {
  if (!dateValue) {
    return "-";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString();
}

function getFilteredProducts() {
  const searchText =
    searchInput.value.trim().toLowerCase();

  const selectedStatus = statusFilter.value;

  return products.filter(function (product) {
    const barcode =
      String(product.barcode || "").toLowerCase();

    const name =
      String(product.name || "").toLowerCase();

    const category =
      String(product.category || "").toLowerCase();

    const matchesSearch =
      barcode.includes(searchText) ||
      name.includes(searchText) ||
      category.includes(searchText);

    const productStatus =
      product.archived === true
        ? "Archived"
        : "Active";

    const matchesStatus =
      selectedStatus === "All" ||
      productStatus === selectedStatus;

    return matchesSearch && matchesStatus;
  });
}

function displayProducts() {
  const filteredProducts = getFilteredProducts();

  productTableBody.innerHTML = "";

  resultCount.textContent =
    `${filteredProducts.length} product(s) found`;

  if (filteredProducts.length === 0) {
    emptyMessage.style.display = "block";
    return;
  }

  emptyMessage.style.display = "none";

  filteredProducts.forEach(function (product) {
    const isArchived = product.archived === true;

    const statusText = isArchived
      ? "Archived"
      : "Active";

    const statusClass = isArchived
      ? "archived-status"
      : "active-status";

    const lastEdited =
      formatDate(product.updated_at) !== "-"
        ? formatDate(product.updated_at)
        : formatDate(product.created_at);

    const actionText = isArchived
      ? "Restore"
      : "Archive";

    const actionClass = isArchived
      ? "restore-button"
      : "archive-button";

    productTableBody.innerHTML += `
      <tr>
        <td>${escapeHtml(product.barcode)}</td>
        <td>${escapeHtml(product.name)}</td>
        <td>${escapeHtml(product.category)}</td>
        <td>${Number(product.stock || 0)}</td>
        <td>${Number(product.minimum_stock || 0)}</td>
        <td>${escapeHtml(product.unit)}</td>
        <td>RM ${Number(product.price || 0).toFixed(2)}</td>
        <td>
          <span class="status ${statusClass}">
            ${statusText}
          </span>
        </td>
        <td>${lastEdited}</td>
        <td>
          <button
            class="${actionClass}"
            type="button"
            data-product-id="${product.id}"
            data-product-name="${escapeHtml(product.name)}"
            data-archived="${isArchived}"
          >
            ${actionText}
          </button>
        </td>
      </tr>
    `;
  });
}

async function setProductArchived(
  productId,
  productName,
  currentlyArchived
) {
  const shouldArchive = !currentlyArchived;

  const actionText = shouldArchive
    ? "Archive"
    : "Restore";

  const message = shouldArchive
    ? `Archive "${productName}"?\n\nIt will disappear from Staff and Supervisor active inventory pages, but remain in reports and stock history.`
    : `Restore "${productName}"?\n\nIt will become available again for Staff and Supervisor pages.`;

  if (!confirm(message)) {
    return;
  }

  const { error } = await supabaseClient.rpc(
    "admin_set_product_archived",
    {
      p_product_id: productId,
      p_archived: shouldArchive
    }
  );

  if (error) {
    alert(`Unable to ${actionText.toLowerCase()} product: ${error.message}`);
    return;
  }

  const product = products.find(function (item) {
    return item.id === productId;
  });

  if (product) {
    product.archived = shouldArchive;
  }

  displayProducts();
}

async function loadProducts() {
  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    emptyMessage.textContent =
      `Unable to load products: ${error.message}`;

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

  await loadProducts();
}

searchInput.addEventListener("input", displayProducts);
statusFilter.addEventListener("change", displayProducts);

productTableBody.addEventListener("click", function (event) {
  const actionButton = event.target.closest(
    ".archive-button, .restore-button"
  );

  if (!actionButton) {
    return;
  }

  setProductArchived(
    actionButton.dataset.productId,
    actionButton.dataset.productName,
    actionButton.dataset.archived === "true"
  );
});

logoutButton.addEventListener("click", logout);

initialisePage();