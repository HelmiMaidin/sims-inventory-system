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

let availabilityChart = null;
let movementChart = null;
let categoryChart = null;

const adminName = document.getElementById("adminName");

const sidebarAdminName =
  document.getElementById("sidebarAdminName");

const welcomeName =
  document.getElementById("welcomeName");

const adminAvatar =
  document.getElementById("adminAvatar");

const sidebarAdminAvatar =
  document.getElementById("sidebarAdminAvatar");

const currentDate =
  document.getElementById("currentDate");

const currentTime =
  document.getElementById("currentTime");

const logoutButton =
  document.getElementById("logoutButton");

function escapeHtml(value) {
  return String(value ?? "-")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function updateDateTime() {
  const now = new Date();

  currentDate.textContent = now.toLocaleDateString("en-MY", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  });

  currentTime.textContent = now.toLocaleTimeString("en-MY", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
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

function isLowStock(product) {
  const stock = getStock(product);
  const minimumStock = getMinimumStock(product);

  return (
    stock === 0 ||
    (stock > 0 && stock < minimumStock)
  );
}

function displayLowStockItems(lowStockItems) {
  const lowStockList =
    document.getElementById("lowStockList");

  const alertCount =
    document.getElementById("alertCount");

  alertCount.textContent = lowStockItems.length;
  lowStockList.innerHTML = "";

  if (lowStockItems.length === 0) {
    lowStockList.innerHTML = `
      <p class="empty-alert">
        ✓ Everything looks good.<br>
        No products currently need restocking.
      </p>
    `;

    return;
  }

  lowStockItems
    .sort(function (first, second) {
      return String(first.name || "").localeCompare(
        String(second.name || ""),
        undefined,
        { sensitivity: "base" }
      );
    })
    .slice(0, 4)
    .forEach(function (product) {
      lowStockList.innerHTML += `
        <div class="low-stock-item">
          <span class="low-stock-icon">!</span>

          <div class="low-stock-info">
            <strong>${escapeHtml(product.name)}</strong>

            <small>
              ${escapeHtml(product.category || "Uncategorized")}
            </small>
          </div>

          <span class="stock-number">
            ${getStock(product)} left
          </span>
        </div>
      `;
    });
}

function createAvailabilityChart(productList) {
  if (availabilityChart) {
    availabilityChart.destroy();
  }

  const available = productList.filter(function (product) {
    return getStock(product) >= getMinimumStock(product);
  }).length;

  const lowStock = productList.filter(function (product) {
    const stock = getStock(product);
    const minimumStock = getMinimumStock(product);

    return (
      stock > 0 &&
      stock < minimumStock
    );
  }).length;

  const outOfStock = productList.filter(function (product) {
    return getStock(product) === 0;
  }).length;

  availabilityChart = new Chart(
    document.getElementById("availabilityChart"),
    {
      type: "doughnut",

      data: {
        labels: ["Available", "Low Stock", "Out of Stock"],

        datasets: [{
          data: [available, lowStock, outOfStock],
          backgroundColor: ["#22c55e", "#f97316", "#dc2626"],
          borderColor: "#ffffff",
          borderWidth: 5,
          hoverOffset: 8
        }]
      },

      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "68%",

        plugins: {
          legend: {
            position: "bottom",

            labels: {
              usePointStyle: true,
              padding: 18
            }
          }
        }
      }
    }
  );
}

function createMovementChart() {
  if (movementChart) {
    movementChart.destroy();
  }

  const stockIn = stockHistory.filter(function (transaction) {
    return transaction.transaction_type === "Stock In";
  }).length;

  const stockOut = stockHistory.filter(function (transaction) {
    return transaction.transaction_type === "Stock Out";
  }).length;

  const adjustments = stockHistory.filter(function (transaction) {
    return transaction.transaction_type === "Stock Adjustment";
  }).length;

  movementChart = new Chart(
    document.getElementById("movementChart"),
    {
      type: "bar",

      data: {
        labels: ["Stock In", "Stock Out", "Adjustment"],

        datasets: [{
          label: "Transactions",
          data: [stockIn, stockOut, adjustments],
          backgroundColor: ["#22c55e", "#db2777", "#7c3aed"],
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
            grid: { color: "#eeeaf5" },
            ticks: { precision: 0 }
          },

          x: {
            grid: { display: false }
          }
        },

        plugins: {
          legend: { display: false }
        }
      }
    }
  );
}

function createCategoryChart(productList) {
  if (categoryChart) {
    categoryChart.destroy();
  }

  const categoryData = {};

  productList.forEach(function (product) {
    const category =
      product.category || "Uncategorized";

    if (!categoryData[category]) {
      categoryData[category] = 0;
    }

    categoryData[category] += getStock(product);
  });

  const categories = Object.keys(categoryData);
  const quantities = Object.values(categoryData);

  categoryChart = new Chart(
    document.getElementById("categoryChart"),
    {
      type: "bar",

      data: {
        labels: categories,

        datasets: [{
          label: "Current Stock Quantity",
          data: quantities,
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
            grid: { color: "#eeeaf5" },
            ticks: { precision: 0 }
          },

          x: {
            grid: { display: false }
          }
        },

        plugins: {
          legend: { display: false }
        }
      }
    }
  );
}

function displayDashboard() {
  const activeProducts = products.filter(function (product) {
    return product.archived !== true;
  });

  const totalQuantity = activeProducts.reduce(
    function (total, product) {
      return total + getStock(product);
    },
    0
  );

  const inventoryValue = activeProducts.reduce(
    function (total, product) {
      return total + (getStock(product) * getPrice(product));
    },
    0
  );

  const lowStockItems = activeProducts.filter(function (product) {
    return isLowStock(product);
  });

  document.getElementById("totalProducts").textContent =
    activeProducts.length;

  document.getElementById("totalQuantity").textContent =
    totalQuantity;

  document.getElementById("inventoryValue").textContent =
    `RM ${inventoryValue.toFixed(2)}`;

  document.getElementById("lowStockCount").textContent =
    lowStockItems.length;

  displayLowStockItems(lowStockItems);
  createAvailabilityChart(activeProducts);
  createMovementChart();
  createCategoryChart(activeProducts);
}

async function loadDashboardData() {
  const [productsResult, historyResult] = await Promise.all([
    supabaseClient
      .from("products")
      .select(
        "id, barcode, name, category, unit, stock, minimum_stock, price, archived"
      )
      .order("name"),

    supabaseClient
      .from("stock_history")
      .select("id, transaction_type, quantity, created_at")
      .order("created_at", { ascending: false })
  ]);

  if (productsResult.error) {
    alert(
      `Unable to load products: ${productsResult.error.message}`
    );

    return;
  }

  if (historyResult.error) {
    alert(
      `Unable to load stock history: ${historyResult.error.message}`
    );

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
  welcomeName.textContent = firstName;

  adminAvatar.textContent = initial;
  sidebarAdminAvatar.textContent = initial;

  await loadDashboardData();
}

logoutButton.addEventListener("click", logout);

updateDateTime();
setInterval(updateDateTime, 1000);

initialisePage();
