const historyTableBody =
  document.getElementById("historyTableBody");

const emptyMessage =
  document.getElementById("emptyMessage");

const searchInput =
  document.getElementById("searchInput");

const typeFilter =
  document.getElementById("typeFilter");

const clearHistoryButton =
  document.getElementById("clearHistoryButton");

function getHistory() {
  return JSON.parse(localStorage.getItem("stockHistory")) || [];
}

function displayHistory() {
  const stockHistory = getHistory();

  const searchText = searchInput.value.toLowerCase();
  const selectedType = typeFilter.value;

  const filteredHistory = stockHistory.filter(function (transaction) {
    const matchesSearch =
      transaction.productName.toLowerCase().includes(searchText) ||
      transaction.barcode.includes(searchText);

    const matchesType =
      selectedType === "All" ||
      transaction.type === selectedType;

    return matchesSearch && matchesType;
  });

  historyTableBody.innerHTML = "";

  if (filteredHistory.length === 0) {
    emptyMessage.style.display = "block";
    return;
  }

  emptyMessage.style.display = "none";

  filteredHistory.forEach(function (transaction) {
    const row = document.createElement("tr");

    const typeClass =
      transaction.type === "Stock In"
        ? "stock-in"
        : "stock-out";

    const quantitySign =
      transaction.type === "Stock In"
        ? "+"
        : "-";

    row.innerHTML = `
      <td>${transaction.date}</td>
      <td>${transaction.barcode}</td>
      <td>${transaction.productName}</td>
      <td>
        <span class="type ${typeClass}">
          ${transaction.type}
        </span>
      </td>
      <td>${quantitySign}${transaction.quantity}</td>
      <td>${transaction.previousStock}</td>
      <td>${transaction.newStock}</td>
      <td>${transaction.reason || "-"}</td>
      <td>${transaction.note || "-"}</td>
    `;

    historyTableBody.appendChild(row);
  });
}

searchInput.addEventListener("input", displayHistory);

typeFilter.addEventListener("change", displayHistory);

clearHistoryButton.addEventListener("click", function () {
  const confirmed = confirm(
    "Are you sure you want to delete all stock history?"
  );

  if (!confirmed) {
    return;
  }

  localStorage.removeItem("stockHistory");

  displayHistory();
});

displayHistory();