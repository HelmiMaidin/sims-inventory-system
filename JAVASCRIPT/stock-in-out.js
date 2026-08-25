const barcodeInput = document.getElementById("barcode");
const quantityInput = document.getElementById("qty");

const stockInRadio = document.getElementById("in");
const stockOutRadio = document.getElementById("out");

const searchButton = document.querySelector(".search");
const stockForm = document.getElementById("stockForm");

const reasonInput = document.getElementById("reason");
const noteInput = document.getElementById("note");

/* First-time sample products.
   These will only be created if the browser has no saved products yet. */
const defaultProducts = [
  {
    barcode: "9551234567890",
    name: "Mineral Water 1.5L",
    category: "Drinks",
    unit: "Bottle",
    stock: 42,
    minimumStock: 10
  },
  {
    barcode: "9551234567891",
    name: "Instant Noodles",
    category: "Food",
    unit: "Pack",
    stock: 30,
    minimumStock: 10
  },
  {
    barcode: "9551234567892",
    name: "Cooking Oil 1kg",
    category: "Cooking Items",
    unit: "Bottle",
    stock: 15,
    minimumStock: 5
  }
];

/* Get saved products from browser.
   If there is no saved data yet, use the sample products. */
let products = JSON.parse(localStorage.getItem("products")) || defaultProducts;

let stockHistory =
  JSON.parse(localStorage.getItem("stockHistory")) || [];

let selectedProduct = null;

function saveData() {
  localStorage.setItem("products", JSON.stringify(products));
  localStorage.setItem("stockHistory", JSON.stringify(stockHistory));
}

function showProduct(product) {
  document.getElementById("productName").textContent = product.name;

  document.getElementById("productDetails").textContent =
    `Barcode: ${product.barcode} · ${product.category} · Unit: ${product.unit}`;

  document.getElementById("currentStock").textContent = product.stock;

  document.getElementById("previewProduct").textContent = product.name;

  document.getElementById("previewCurrent").textContent =
    `${product.stock} ${product.unit.toLowerCase()}s`;
}

function clearProductDisplay() {
  document.getElementById("productName").textContent = "No product selected";

  document.getElementById("productDetails").textContent =
    "Enter a barcode number and click Search Product.";

  document.getElementById("currentStock").textContent = "—";

  document.getElementById("previewProduct").textContent = "—";
  document.getElementById("previewCurrent").textContent = "—";
  document.getElementById("previewQuantity").textContent = "—";
  document.getElementById("previewNew").textContent = "—";
}

function updatePreview() {
  const quantity = Number(quantityInput.value) || 0;
  const isStockIn = stockInRadio.checked;

  document.getElementById("previewType").textContent =
    isStockIn ? "Stock In" : "Stock Out";

  document.getElementById("previewType").style.color =
    isStockIn ? "#15803d" : "#dc2626";

  if (!selectedProduct) {
    document.getElementById("previewQuantity").textContent = "—";
    document.getElementById("previewNew").textContent = "—";
    return;
  }

  let newStock;

  if (isStockIn) {
    newStock = selectedProduct.stock + quantity;
  } else {
    newStock = selectedProduct.stock - quantity;
  }

  document.getElementById("previewQuantity").textContent =
    quantity || "—";

  document.getElementById("previewNew").textContent =
    quantity ? newStock : "—";
}

function searchProduct() {
  const enteredBarcode = barcodeInput.value.trim();

  selectedProduct = products.find(function (product) {
    return product.barcode === enteredBarcode;
  });

  if (!selectedProduct) {
    clearProductDisplay();
    alert("Product barcode not found.");
    return;
  }

  showProduct(selectedProduct);
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

stockForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const quantity = Number(quantityInput.value);
  const isStockIn = stockInRadio.checked;

  if (!selectedProduct) {
    alert("Please search for a product barcode first.");
    return;
  }

  if (!quantity || quantity < 1) {
    alert("Please enter a valid quantity.");
    return;
  }

  if (!isStockIn && quantity > selectedProduct.stock) {
    alert(
      `Not enough stock. Available stock: ${selectedProduct.stock} ${selectedProduct.unit}(s).`
    );
    return;
  }

  const previousStock = selectedProduct.stock;

  if (isStockIn) {
    selectedProduct.stock += quantity;
  } else {
    selectedProduct.stock -= quantity;
  }

  const transaction = {
    id: Date.now(),
    date: new Date().toLocaleString(),
    barcode: selectedProduct.barcode,
    productName: selectedProduct.name,
    type: isStockIn ? "Stock In" : "Stock Out",
    quantity: quantity,
    previousStock: previousStock,
    newStock: selectedProduct.stock,
    reason: reasonInput.value,
    note: noteInput.value
  };

  stockHistory.unshift(transaction);

  saveData();

  showProduct(selectedProduct);

  quantityInput.value = "";
  noteInput.value = "";

  updatePreview();

  alert(
    `${transaction.type} recorded successfully.\n\n` +
    `Product: ${selectedProduct.name}\n` +
    `New stock: ${selectedProduct.stock}`
  );
});

clearProductDisplay();
updatePreview();