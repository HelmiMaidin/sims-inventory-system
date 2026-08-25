const SUPABASE_URL = "https://ocycijajjkqfsrcnpbmn.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_EDDbsmJyHARgnhGsQ_dcjA_HHItlr8T";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

let currentUser = null;
let selectedProduct = null;

const barcodeInput = document.getElementById("barcode");
const quantityInput = document.getElementById("qty");
const reasonInput = document.getElementById("reason");
const noteInput = document.getElementById("note");

const stockInRadio = document.getElementById("in");
const stockOutRadio = document.getElementById("out");

const searchButton = document.querySelector(".search");
const stockForm = document.getElementById("stockForm");
const transactionMessage = document.getElementById("transactionMessage");

const logoutButton = document.getElementById("logoutButton");
const staffName = document.getElementById("staffName");
const sidebarStaffName = document.getElementById("sidebarStaffName");

function showMessage(text, type) {
  transactionMessage.textContent = text;
  transactionMessage.className = `message ${type}`;
}

function clearProductDisplay() {
  selectedProduct = null;

  document.getElementById("productName").textContent =
    "No product selected";

  document.getElementById("productDetails").textContent =
    "Enter a barcode number and click Search Product.";

  document.getElementById("currentStock").textContent = "—";

  document.getElementById("previewProduct").textContent = "—";
  document.getElementById("previewCurrent").textContent = "—";
  document.getElementById("previewQuantity").textContent = "—";
  document.getElementById("previewNew").textContent = "—";
}

function showProduct(product) {
  const currentStock = Number(product.stock || 0);

  document.getElementById("productName").textContent =
    product.name || "Unnamed Product";

  document.getElementById("productDetails").textContent =
    `Barcode: ${product.barcode} · ${product.category || "-"} · Unit: ${product.unit || "-"}`;

  document.getElementById("currentStock").textContent = currentStock;

  document.getElementById("previewProduct").textContent =
    product.name || "Unnamed Product";

  document.getElementById("previewCurrent").textContent =
    `${currentStock} ${product.unit || "Unit"}(s)`;
}

function updatePreview() {
  const quantity = Number(quantityInput.value) || 0;
  const isStockIn = stockInRadio.checked;

  const previewType = document.getElementById("previewType");

  previewType.textContent = isStockIn ? "Stock In" : "Stock Out";

  previewType.className = isStockIn
    ? "preview-stock-in"
    : "preview-stock-out";

  if (!selectedProduct) {
    document.getElementById("previewQuantity").textContent = "—";
    document.getElementById("previewNew").textContent = "—";
    return;
  }

  const currentStock = Number(selectedProduct.stock || 0);

  const newStock = isStockIn
    ? currentStock + quantity
    : currentStock - quantity;

  document.getElementById("previewQuantity").textContent =
    quantity ? quantity : "—";

  document.getElementById("previewNew").textContent =
    quantity
      ? `${newStock} ${selectedProduct.unit || "Unit"}(s)`
      : "—";
}

async function searchProduct() {
  const enteredBarcode = barcodeInput.value.trim();

  if (!enteredBarcode) {
    showMessage(
      "Please enter or scan a barcode number first.",
      "error"
    );
    return;
  }

  searchButton.disabled = true;
  searchButton.textContent = "Searching...";

  const { data, error } = await supabaseClient
    .from("products")
    .select("id, barcode, name, category, unit, stock, minimum_stock, price, archived")
    .eq("barcode", enteredBarcode)
    .eq("archived", false)
    .maybeSingle();

  searchButton.disabled = false;
  searchButton.textContent = "Search Product";

  if (error) {
    showMessage(`Unable to search product: ${error.message}`, "error");
    return;
  }

  if (!data) {
    clearProductDisplay();

    showMessage(
      "Item not found or it has been archived. Please add an active item first.",
      "error"
    );
    return;
  }

  selectedProduct = data;

  showProduct(selectedProduct);
  updatePreview();

  showMessage(
    `"${selectedProduct.name}" was found successfully.`,
    "success"
  );
}

async function recordStockMovement(event) {
  event.preventDefault();

  if (!selectedProduct) {
    showMessage(
      "Please search for an existing product barcode first.",
      "error"
    );
    return;
  }

  const quantity = Number(quantityInput.value);
  const isStockIn = stockInRadio.checked;

  if (!Number.isInteger(quantity) || quantity < 1) {
    showMessage(
      "Please enter a valid whole quantity greater than zero.",
      "error"
    );
    return;
  }

  const previousStock = Number(selectedProduct.stock || 0);

  if (!isStockIn && quantity > previousStock) {
    showMessage(
      `Not enough stock. Available: ${previousStock} ${selectedProduct.unit}(s).`,
      "error"
    );
    return;
  }

  const confirmButton = stockForm.querySelector(".confirm");

  confirmButton.disabled = true;
  confirmButton.textContent = "Saving...";

  const transactionType = isStockIn ? "Stock In" : "Stock Out";

  const { data, error } = await supabaseClient.rpc(
    "record_stock_movement",
    {
      p_barcode: selectedProduct.barcode,
      p_transaction_type: transactionType,
      p_quantity: quantity,
      p_reason: reasonInput.value,
      p_note: noteInput.value.trim()
    }
  );

  confirmButton.disabled = false;
  confirmButton.textContent = "Confirm Stock Transaction";

  if (error) {
    showMessage(
      `Transaction could not be saved: ${error.message}`,
      "error"
    );
    return;
  }

  selectedProduct.stock = Number(data.new_stock);

  showProduct(selectedProduct);

  quantityInput.value = "";
  noteInput.value = "";

  updatePreview();

  showMessage(
    `${transactionType} recorded successfully. New stock: ${data.new_stock} ${data.unit}(s).`,
    "success"
  );
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
  const { data, error } = await supabaseClient.auth.getSession();

  if (error || !data.session) {
    window.location.href = "login.html";
    return;
  }

  const { data: profile, error: profileError } = await supabaseClient
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
    name: profile.full_name,
    role: profile.role
  };

  /* Keeps older SIMS pages compatible while they are being migrated. */
  localStorage.setItem(
    "currentUser",
    JSON.stringify(currentUser)
  );

  staffName.textContent = currentUser.name;

  if (sidebarStaffName) {
    sidebarStaffName.textContent = currentUser.name;
  }

  clearProductDisplay();
  updatePreview();
}

searchButton.addEventListener("click", searchProduct);

barcodeInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    searchProduct();
  }
});

quantityInput.addEventListener("input", updatePreview);
stockInRadio.addEventListener("change", updatePreview);
stockOutRadio.addEventListener("change", updatePreview);

stockForm.addEventListener("submit", recordStockMovement);
logoutButton.addEventListener("click", logout);

initialisePage();