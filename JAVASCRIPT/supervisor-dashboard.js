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

const totalProducts =
  document.getElementById("totalProducts");

const totalStock =
  document.getElementById("totalStock");

const lowStockCount =
  document.getElementById("lowStockCount");

const todayTransactions =
  document.getElementById("todayTransactions");

const lowStockList =
  document.getElementById("lowStockList");

const recentActivityList =
  document.getElementById("recentActivityList");

function escapeHtml(value) {
  return String(value ?? "-")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getProductStock(product) {
  return Number(product.stock || 0);
}

function getMinimumStock(product) {
  return Number(product.minimum_stock || 0);
}

function getLowStockItems() {
  return products
    .filter(function (product) {
      const stock = getProductStock(product);
      const minimumStock = getMinimumStock(product);

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

function getActivityStyle(transaction) {
  if (transaction.transaction_type === "Stock In") {
    return {
      className: "stock-in",
      sign: "+"
    };
  }

  if (transaction.transaction_type === "Add Item") {
    return {
      className: "add-item",
      sign: "+"
    };
  }

  if (transaction.transaction_type === "Stock Adjustment") {
    const isIncrease =
      Number(transaction.new_stock) >
      Number(transaction.previous_stock);

    return {
      className: isIncrease ? "stock-in" : "stock-out",
      sign: isIncrease ? "+" : "-"
    };
  }

  return {
    className: "stock-out",
    sign: "-"
  };
}

function displayLowStock(lowStockItems) {
  lowStockList.innerHTML = "";

  if (lowStockItems.length === 0) {
    lowStockList.innerHTML =
      `<p class="empty">All products have sufficient stock.</p>`;

    return;
  }

  lowStockItems
    .slice(0, 5)
    .forEach(function (product) {
      const stock = getProductStock(product);

      const label = stock === 0
        ? "Out of stock"
        : "Low stock";

      lowStockList.innerHTML += `
        <div class="list-item">
          <div>
            <div class="item-name">
              ${escapeHtml(product.name)}
            </div>

            <div class="item-details">
              ${escapeHtml(label)} ·
              Barcode: ${escapeHtml(product.barcode)} ·
              Minimum: ${getMinimumStock(product)}
            </div>
          </div>

          <div class="stock-number low-stock">
            ${stock}
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
    recentActivityList.innerHTML =
      `<p class="empty">No inventory activity has been recorded yet.</p>`;

    return;
  }

  recentTransactions.forEach(function (transaction) {
    const style = getActivityStyle(transaction);

    const date = new Date(transaction.created_at);

    const displayedDate = Number.isNaN(date.getTime())
      ? "-"
      : date.toLocaleString();

    recentActivityList.innerHTML += `
      <div class="list-item">
        <div>
          <div class="item-name">
            ${escapeHtml(transaction.product_name)}
          </div>

          <div class="item-details">
            ${escapeHtml(transaction.transaction_type)} ·
            ${escapeHtml(displayedDate)}
          </div>
        </div>

        <div class="stock-number ${style.className}">
          ${style.sign}${Number(transaction.quantity || 0)}
        </div>
      </div>
    `;
  });
}

function displayDashboard() {
  const activeProducts = products.filter(function (product) {
    return product.archived !== true;
  });

  const lowStockItems = getLowStockItems();

  const totalQuantity = activeProducts.reduce(
    function (total, product) {
      return total + getProductStock(product);
    },
    0
  );

  const movementsToday = stockHistory.filter(
    function (transaction) {
      return isToday(transaction.created_at);
    }
  );

  totalProducts.textContent = activeProducts.length;
  totalStock.textContent = totalQuantity;
  lowStockCount.textContent = lowStockItems.length;
  todayTransactions.textContent = movementsToday.length;

  displayLowStock(lowStockItems);
  displayRecentActivity();
}

async function loadDashboardData() {
  const [productsResult, historyResult] = await Promise.all([
    supabaseClient
      .from("products")
      .select(`
        id,
        barcode,
        name,
        category,
        unit,
        stock,
        minimum_stock,
        archived
      `),

    supabaseClient
      .from("stock_history")
      .select(`
        id,
        product_name,
        transaction_type,
        quantity,
        previous_stock,
        new_stock,
        created_at
      `)
      .order("created_at", { ascending: false })
  ]);

  if (productsResult.error || historyResult.error) {
    const error =
      productsResult.error || historyResult.error;

    lowStockList.innerHTML = `
      <p class="empty">
        Unable to load dashboard data:
        ${escapeHtml(error.message)}
      </p>
    `;

    recentActivityList.innerHTML = "";
    return;
  }

  products = productsResult.data || [];
  stockHistory = historyResult.data || [];

  displayDashboard();
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

  loadDashboardData();
}

logoutButton.addEventListener("click", logout);

initialisePage();
