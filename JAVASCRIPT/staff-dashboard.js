const SUPABASE_URL = "https://ocycijajjkqfsrcnpbmn.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_EDDbsmJyHARgnhGsQ_dcjA_HHItlr8T";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

let currentUser = null;
let products = [];
let stockHistory = [];

const totalProducts = document.getElementById("totalProducts");

const totalStock = document.getElementById("totalStock");

const lowStockCount = document.getElementById("lowStockCount");

const todayTransactions =
  document.getElementById("todayTransactions");

const lowStockList = document.getElementById("lowStockList");

const recentActivityList =
  document.getElementById("recentActivityList");

const staffName = document.getElementById("staffName");

const logoutButton = document.getElementById("logoutButton");

function escapeHtml(value) {
  return String(value ?? "-")
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

function isLowStock(product) {
  const stock = getStock(product);
  const minimumStock = getMinimumStock(product);

  return stock === 0 || (stock > 0 && stock < minimumStock);
}

function isToday(dateValue) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const today = new Date();

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function getTransactionStyle(transaction) {
  if (transaction.transaction_type === "Stock Out") {
    return {
      className: "stock-out",
      sign: "-"
    };
  }

  return {
    className: "stock-in",
    sign: "+"
  };
}

function displayLowStockItems(lowStockItems) {
  lowStockList.innerHTML = "";

  if (lowStockItems.length === 0) {
    lowStockList.innerHTML = `
      <p class="empty">
        All products have sufficient stock.
      </p>
    `;

    return;
  }

  lowStockItems
    .sort(function (firstProduct, secondProduct) {
      return String(firstProduct.name || "").localeCompare(
        String(secondProduct.name || ""),
        undefined,
        { sensitivity: "base" }
      );
    })
    .slice(0, 5)
    .forEach(function (product) {
      lowStockList.innerHTML += `
        <div class="list-item">
          <div>
            <div class="item-name">
              ${escapeHtml(product.name)}
            </div>

            <div class="item-details">
              Barcode: ${escapeHtml(product.barcode)} ·
              Minimum: ${getMinimumStock(product)}
            </div>
          </div>

          <div class="stock-number low-stock">
            ${getStock(product)}
            ${escapeHtml(product.unit || "Unit")}(s)
          </div>
        </div>
      `;
    });
}

function displayRecentActivity() {
  recentActivityList.innerHTML = "";

  const recentTransactions = stockHistory.slice(0, 5);

  if (recentTransactions.length === 0) {
    recentActivityList.innerHTML = `
      <p class="empty">
        No stock transactions yet.
      </p>
    `;

    return;
  }

  recentTransactions.forEach(function (transaction) {
    const transactionStyle =
      getTransactionStyle(transaction);

    const transactionDate =
      new Date(transaction.created_at);

    const displayedDate = Number.isNaN(transactionDate.getTime())
      ? "-"
      : transactionDate.toLocaleString();

    recentActivityList.innerHTML += `
      <div class="list-item">
        <div>
          <div class="item-name">
            ${escapeHtml(transaction.product_name)}
          </div>

          <div class="item-details">
            ${escapeHtml(displayedDate)} ·
            ${escapeHtml(transaction.transaction_type)}
          </div>
        </div>

        <div class="stock-number ${transactionStyle.className}">
          ${transactionStyle.sign}${Number(transaction.quantity || 0)}
        </div>
      </div>
    `;
  });
}

function displayDashboard() {
  const activeProducts = products.filter(function (product) {
    return product.archived !== true;
  });

  const lowStockItems = activeProducts.filter(function (product) {
    return isLowStock(product);
  });

  const stockQuantity = activeProducts.reduce(
    function (total, product) {
      return total + getStock(product);
    },
    0
  );

  const movementToday = stockHistory.filter(function (transaction) {
    return (
      isToday(transaction.created_at) &&
      (
        transaction.transaction_type === "Stock In" ||
        transaction.transaction_type === "Stock Out"
      )
    );
  });

  totalProducts.textContent = activeProducts.length;
  totalStock.textContent = stockQuantity;
  lowStockCount.textContent = lowStockItems.length;
  todayTransactions.textContent = movementToday.length;

  displayLowStockItems(lowStockItems);
  displayRecentActivity();
}

async function loadDashboardData() {
  const [productsResponse, historyResponse] = await Promise.all([
    supabaseClient
      .from("products")
      .select(
        "id, barcode, name, unit, stock, minimum_stock, archived"
      )
      .eq("archived", false)
      .order("name", { ascending: true }),

    supabaseClient
      .from("stock_history")
      .select(
        `
          id,
          product_name,
          transaction_type,
          quantity,
          created_at
        `
      )
      .order("created_at", { ascending: false })
  ]);

  if (productsResponse.error) {
    lowStockList.innerHTML = `
      <p class="empty">
        Unable to load products:
        ${escapeHtml(productsResponse.error.message)}
      </p>
    `;

    return;
  }

  if (historyResponse.error) {
    recentActivityList.innerHTML = `
      <p class="empty">
        Unable to load stock history:
        ${escapeHtml(historyResponse.error.message)}
      </p>
    `;

    return;
  }

  products = productsResponse.data || [];
  stockHistory = historyResponse.data || [];

  displayDashboard();
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

  localStorage.setItem(
    "currentUser",
    JSON.stringify(currentUser)
  );

  staffName.textContent = currentUser.name || "Staff User";

  loadDashboardData();
}

logoutButton.addEventListener("click", logout);

initialisePage();
