const SUPABASE_URL = "https://ocycijajjkqfsrcnpbmn.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_EDDbsmJyHARgnhGsQ_dcjA_HHItlr8T";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

let currentUser = null;

const addItemForm = document.getElementById("addItemForm");

const barcodeInput = document.getElementById("barcode");

const generateBarcodeButton =
  document.getElementById("generateBarcodeButton");

const barcodePreviewSection =
  document.getElementById("barcodePreviewSection");

const barcodePreview =
  document.getElementById("barcodePreview");

const printBarcodeButton =
  document.getElementById("printBarcodeButton");

const message = document.getElementById("message");

const staffName = document.getElementById("staffName");

const logoutButton = document.getElementById("logoutButton");

function showMessage(text, type) {
  message.textContent = text;
  message.className = `message ${type}`;
}

function calculateEan13CheckDigit(firstTwelveDigits) {
  let total = 0;

  for (let index = 0; index < firstTwelveDigits.length; index++) {
    const digit = Number(firstTwelveDigits[index]);

    total += index % 2 === 0
      ? digit
      : digit * 3;
  }

  return (10 - (total % 10)) % 10;
}

function isValidEan13(barcode) {
  if (!/^\d{13}$/.test(barcode)) {
    return false;
  }

  const firstTwelveDigits = barcode.substring(0, 12);

  const expectedCheckDigit =
    calculateEan13CheckDigit(firstTwelveDigits);

  return Number(barcode[12]) === expectedCheckDigit;
}

async function barcodeExists(barcode) {
  const { data, error } = await supabaseClient
    .from("products")
    .select("id")
    .eq("barcode", barcode)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data !== null;
}

async function createUniqueEan13Barcode() {
  const prefix = "200";
  const timestampNumber =
    Number(String(Date.now()).slice(-9));

  let attempt = 0;

  while (attempt < 50) {
    const itemNumber = String(timestampNumber + attempt)
      .slice(-9)
      .padStart(9, "0");

    const firstTwelveDigits = `${prefix}${itemNumber}`;

    const checkDigit =
      calculateEan13CheckDigit(firstTwelveDigits);

    const barcode = `${firstTwelveDigits}${checkDigit}`;

    const exists = await barcodeExists(barcode);

    if (!exists) {
      return barcode;
    }

    attempt++;
  }

  throw new Error(
    "Unable to generate a unique barcode. Please try again."
  );
}

function showBarcodePreview(barcode) {
  if (!isValidEan13(barcode)) {
    barcodePreviewSection.classList.remove("show");
    return;
  }

  try {
    JsBarcode(
      "#barcodePreview",
      barcode,
      {
        format: "EAN13",
        width: 2,
        height: 80,
        displayValue: true,
        fontSize: 16,
        margin: 8,
        lineColor: "#111827",
        background: "#ffffff"
      }
    );

    barcodePreviewSection.classList.add("show");
  } catch (error) {
    barcodePreviewSection.classList.remove("show");
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function generateBarcode() {
  generateBarcodeButton.disabled = true;
  generateBarcodeButton.textContent = "Generating...";

  try {
    const generatedBarcode =
      await createUniqueEan13Barcode();

    barcodeInput.value = generatedBarcode;

    showBarcodePreview(generatedBarcode);

    showMessage(
      `EAN-13 barcode ${generatedBarcode} was generated successfully.`,
      "success"
    );
  } catch (error) {
    showMessage(
      `Unable to generate barcode: ${error.message}`,
      "error"
    );
  }

  generateBarcodeButton.disabled = false;
  generateBarcodeButton.textContent = "Generate Barcode";
}

function printBarcode() {
  const barcode = barcodeInput.value.trim();

  const productName =
    document.getElementById("productName").value.trim() ||
    "New SIMS Item";

  if (!isValidEan13(barcode)) {
    showMessage(
      "Generate or enter a valid 13-digit EAN-13 barcode before printing.",
      "error"
    );

    return;
  }

  const printWindow = window.open(
    "",
    "_blank",
    "width=500,height=400"
  );

  if (!printWindow) {
    showMessage(
      "Your browser blocked the print window. Please allow pop-ups and try again.",
      "error"
    );

    return;
  }

  printWindow.document.write(`
    <!doctype html>
    <html lang="en">
      <head>
        <title>SIMS Barcode Label</title>
        <style>
          body {
            display: grid;
            min-height: 100vh;
            margin: 0;
            place-items: center;
            font-family: Arial, sans-serif;
          }

          .label {
            width: 330px;
            padding: 24px;
            text-align: center;
            border: 2px solid #111827;
            border-radius: 10px;
          }

          h1 {
            margin: 0 0 7px;
            color: #1d4ed8;
            font-size: 22px;
          }

          p {
            margin: 0 0 15px;
            font-size: 15px;
            font-weight: bold;
          }

          svg {
            max-width: 100%;
          }
        </style>
      </head>

      <body>
        <div class="label">
          <h1>SIMS</h1>
          <p>${escapeHtml(productName)}</p>
          ${barcodePreview.outerHTML}
        </div>

        <script>
          window.onload = function () {
            window.print();
          };
        <\/script>
      </body>
    </html>
  `);

  printWindow.document.close();
}

async function addNewItem(event) {
  event.preventDefault();

  const barcode = barcodeInput.value.trim();

  const name =
    document.getElementById("productName").value.trim();

  const category =
    document.getElementById("category").value.trim();

  const unit =
    document.getElementById("unit").value;

  const stock =
    Number(document.getElementById("stock").value);

  const minimumStock =
    Number(document.getElementById("minimumStock").value);

  const price =
    Number(document.getElementById("price").value);

  if (!isValidEan13(barcode)) {
    showMessage(
      "Please enter or generate a valid 13-digit EAN-13 barcode.",
      "error"
    );
    return;
  }

  if (!name || !category || !unit) {
    showMessage(
      "Please complete all required product details.",
      "error"
    );
    return;
  }

  if (!Number.isInteger(stock) || stock < 0) {
    showMessage(
      "Current quantity must be a whole number of zero or more.",
      "error"
    );
    return;
  }

  if (!Number.isInteger(minimumStock) || minimumStock < 0) {
    showMessage(
      "Minimum quantity must be a whole number of zero or more.",
      "error"
    );
    return;
  }

  if (Number.isNaN(price) || price < 0) {
    showMessage(
      "Please enter a valid price of zero or more.",
      "error"
    );
    return;
  }

  const saveButton =
    addItemForm.querySelector(".save-button");

  saveButton.disabled = true;
  saveButton.textContent = "Adding Item...";

  const { data, error } = await supabaseClient.rpc(
    "create_product",
    {
      p_barcode: barcode,
      p_name: name,
      p_category: category,
      p_unit: unit,
      p_stock: stock,
      p_minimum_stock: minimumStock,
      p_price: price
    }
  );

  saveButton.disabled = false;
  saveButton.textContent = "Add New Item";

  if (error) {
    showMessage(
      `Unable to add item: ${error.message}`,
      "error"
    );
    return;
  }

  showMessage(
    `"${data.product_name}" was added successfully with barcode ${data.barcode}.`,
    "success"
  );

  addItemForm.reset();
  barcodePreviewSection.classList.remove("show");
  barcodeInput.focus();
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
    name: profile.full_name,
    role: profile.role
  };

  localStorage.setItem(
    "currentUser",
    JSON.stringify(currentUser)
  );

  staffName.textContent = currentUser.name;
}

generateBarcodeButton.addEventListener(
  "click",
  generateBarcode
);

barcodeInput.addEventListener("input", function () {
  showBarcodePreview(barcodeInput.value.trim());
});

printBarcodeButton.addEventListener("click", printBarcode);

addItemForm.addEventListener("submit", addNewItem);

logoutButton.addEventListener("click", logout);

initialisePage();