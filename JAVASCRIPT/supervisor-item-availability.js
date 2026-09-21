const SUPABASE_URL = "https://ocycijajjkqfsrcnpbmn.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_EDDbsmJyHARgnhGsQ_dcjA_HHItlr8T";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

let currentUser = null;
let products = [];

const searchInput =
  document.getElementById("searchInput");

const searchButton =
  document.getElementById("searchButton");

const productTableBody =
  document.getElementById("productTableBody");

const resultCount =
  document.getElementById("resultCount");

const emptyMessage =
  document.getElementById("emptyMessage");

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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getAvailabilityStatus(product) {
  const stock = Number(product.stock || 0);

  const minimumStock =
    Number(product.minimum_stock || 0);

  if (stock <= 0) {
    return {
      text: "Out of Stock",
      className: "out-of-stock"
    };
  }

  if (stock < minimumStock) {
    return {
      text: "Low Stock",
      className: "low-stock"
    };
  }

  return {
    text: "Available",
    className: "available"
  };
}

function displayProducts() {
  const searchText =
    searchInput.value.trim().toLowerCase();

  const filteredProducts = products.filter(function (product) {
    const barcode =
      String(product.barcode || "").toLowerCase();

    const productName =
      String(product.name || "").toLowerCase();

    return (
      barcode.includes(searchText) ||
      productName.includes(searchText)
    );
  });

  productTableBody.innerHTML = "";

  resultCount.textContent =
    `${filteredProducts.length} item(s) found`;

  if (filteredProducts.length === 0) {
    emptyMessage.style.display = "block";
    return;
  }

  emptyMessage.style.display = "none";

  filteredProducts.forEach(function (product) {
    const availability =
      getAvailabilityStatus(product);

    const price =
      Number(product.price || 0).toFixed(2);

    productTableBody.innerHTML += `
      <tr>
        <td>${escapeHtml(product.barcode)}</td>
        <td>${escapeHtml(product.name)}</td>
        <td>${escapeHtml(product.category || "-")}</td>
        <td>${Number(product.stock || 0)}</td>
        <td>${Number(product.minimum_stock || 0)}</td>
        <td>${escapeHtml(product.unit || "-")}</td>
        <td>RM ${price}</td>
        <td>
          <span class="status ${availability.className}">
            ${availability.text}
          </span>
        </td>
      </tr>
    `;
  });
}

async function loadProducts() {
  searchButton.disabled = true;
  searchButton.textContent = "Loading...";

  const { data, error } = await supabaseClient
    .from("products")
    .select(
      "id, barcode, name, category, unit, stock, minimum_stock, price, archived"
    )
    .eq("archived", false)
    .order("name", { ascending: true });

  searchButton.disabled = false;
  searchButton.textContent = "Search";

  if (error) {
    products = [];
    productTableBody.innerHTML = "";
    resultCount.textContent = "";

    emptyMessage.textContent =
      `Unable to load products: ${error.message}`;

    emptyMessage.style.display = "block";

    return;
  }

  products = data || [];
  displayProducts();
}

async function logout() {
  const confirmed = confirm("Are you sure you want to logout?");

  if (!confirmed) {
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

searchInput.addEventListener("input", displayProducts);

searchInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    displayProducts();
  }
});

searchButton.addEventListener("click", displayProducts);

logoutButton.addEventListener("click", logout);

initialisePage();
