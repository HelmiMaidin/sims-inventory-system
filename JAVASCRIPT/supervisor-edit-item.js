const SUPABASE_URL = "https://ocycijajjkqfsrcnpbmn.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_EDDbsmJyHARgnhGsQ_dcjA_HHItlr8T";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

let currentUser = null;
let selectedProduct = null;

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

const searchBarcode =
  document.getElementById("searchBarcode");

const searchButton =
  document.getElementById("searchButton");

const searchMessage =
  document.getElementById("searchMessage");

const editItemForm =
  document.getElementById("editItemForm");

const selectedProductName =
  document.getElementById("selectedProductName");

const barcodeDisplay =
  document.getElementById("barcodeDisplay");

const productNameInput =
  document.getElementById("productName");

const categoryInput =
  document.getElementById("category");

const unitInput =
  document.getElementById("unit");

const stockInput =
  document.getElementById("stock");

const minimumStockInput =
  document.getElementById("minimumStock");

const priceInput =
  document.getElementById("price");

const adjustmentReasonInput =
  document.getElementById("adjustmentReason");

const adjustmentNoteInput =
  document.getElementById("adjustmentNote");

function showMessage(text, type) {
  searchMessage.textContent = text;
  searchMessage.className = `message ${type}`;
}

function clearForm() {
  selectedProduct = null;

  editItemForm.classList.add("hidden");

  selectedProductName.textContent = "Product Name";
  barcodeDisplay.textContent = "-";

  productNameInput.value = "";
  categoryInput.value = "";
  unitInput.value = "Piece";
  stockInput.value = "";
  minimumStockInput.value = "";
  priceInput.value = "";

  adjustmentReasonInput.value = "";
  adjustmentNoteInput.value = "";
}

function showSelectedProduct(product) {
  selectedProduct = product;

  barcodeDisplay.textContent = product.barcode || "-";
  selectedProductName.textContent = product.name || "Unnamed Product";

  productNameInput.value = product.name || "";
  categoryInput.value = product.category || "";
  unitInput.value = product.unit || "Piece";
  stockInput.value = Number(product.stock || 0);
  minimumStockInput.value = Number(product.minimum_stock || 0);
  priceInput.value = Number(product.price || 0).toFixed(2);

  adjustmentReasonInput.value = "";
  adjustmentNoteInput.value = "";

  editItemForm.classList.remove("hidden");
}

async function searchItem() {
  const searchText = searchBarcode.value.trim();

  if (searchText === "") {
    clearForm();

    showMessage(
      "Please enter a barcode number or product name first.",
      "error"
    );

    return;
  }

  searchButton.disabled = true;
  searchButton.textContent = "Searching...";

  let product = null;

  const barcodeResult = await supabaseClient
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
    .eq("barcode", searchText)
    .eq("archived", false)
    .maybeSingle();

  if (barcodeResult.error) {
    searchButton.disabled = false;
    searchButton.textContent = "Search Item";

    clearForm();

    showMessage(
      `Unable to search item: ${barcodeResult.error.message}`,
      "error"
    );

    return;
  }

  product = barcodeResult.data;

  if (!product) {
    const nameResult = await supabaseClient
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
      .eq("archived", false)
      .ilike("name", `%${searchText}%`)
      .order("name", { ascending: true })
      .limit(1);

    searchButton.disabled = false;
    searchButton.textContent = "Search Item";

    if (nameResult.error) {
      clearForm();

      showMessage(
        `Unable to search item: ${nameResult.error.message}`,
        "error"
      );

      return;
    }

    if (nameResult.data && nameResult.data.length > 0) {
      product = nameResult.data[0];
    }
  } else {
    searchButton.disabled = false;
    searchButton.textContent = "Search Item";
  }

  if (!product) {
    clearForm();

    showMessage(
      "Item not found or archived. Try another barcode or product name.",
      "error"
    );

    return;
  }

  showSelectedProduct(product);

  showMessage(
    `"${product.name}" is ready to edit.`,
    "success"
  );
}

async function saveChanges(event) {
  event.preventDefault();

  if (!selectedProduct) {
    showMessage(
      "Please search and select an existing item first.",
      "error"
    );

    return;
  }

  const productName = productNameInput.value.trim();
  const category = categoryInput.value.trim();
  const unit = unitInput.value;

  const newStock = Number(stockInput.value);
  const newMinimumStock = Number(minimumStockInput.value);
  const newPrice = Number(priceInput.value);

  const adjustmentReason = adjustmentReasonInput.value;
  const adjustmentNote = adjustmentNoteInput.value.trim();

  if (productName === "" || category === "") {
    showMessage(
      "Product name and category cannot be empty.",
      "error"
    );

    return;
  }

  if (
    !Number.isInteger(newStock) ||
    !Number.isInteger(newMinimumStock) ||
    Number.isNaN(newPrice) ||
    newStock < 0 ||
    newMinimumStock < 0 ||
    newPrice < 0
  ) {
    showMessage(
      "Quantity values must be whole numbers and cannot be negative.",
      "error"
    );

    return;
  }

  const previousStock = Number(selectedProduct.stock || 0);
  const stockChanged = previousStock !== newStock;

  if (stockChanged && adjustmentReason === "") {
    showMessage(
      "Please select an adjustment reason before changing the current quantity.",
      "error"
    );

    return;
  }

  const saveButton =
    editItemForm.querySelector(".save-button");

  saveButton.disabled = true;
  saveButton.textContent = "Saving...";

  const { data, error } = await supabaseClient.rpc(
    "supervisor_update_product",
    {
      p_barcode: selectedProduct.barcode,
      p_name: productName,
      p_category: category,
      p_unit: unit,
      p_stock: newStock,
      p_minimum_stock: newMinimumStock,
      p_price: newPrice,
      p_adjustment_reason: stockChanged
        ? adjustmentReason
        : null,
      p_adjustment_note: stockChanged
        ? adjustmentNote
        : null
    }
  );

  saveButton.disabled = false;
  saveButton.textContent = "Save Changes";

  if (error) {
    showMessage(
      `Unable to update item: ${error.message}`,
      "error"
    );

    return;
  }

  selectedProduct.name = productName;
  selectedProduct.category = category;
  selectedProduct.unit = unit;
  selectedProduct.stock = newStock;
  selectedProduct.minimum_stock = newMinimumStock;
  selectedProduct.price = newPrice;

  selectedProductName.textContent = productName;

  adjustmentReasonInput.value = "";
  adjustmentNoteInput.value = "";

  const stockMessage = stockChanged
    ? ` Stock changed from ${previousStock} to ${data.stock}.`
    : "";

  showMessage(
    `"${productName}" was updated successfully.${stockMessage}`,
    "success"
  );
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
}

searchButton.addEventListener("click", searchItem);

searchBarcode.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    searchItem();
  }
});

editItemForm.addEventListener("submit", saveChanges);

logoutButton.addEventListener("click", logout);

initialisePage();