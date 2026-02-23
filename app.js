const STORAGE_KEY = "cashly_entries";
const BUDGET_KEY = "cashly_budget";

const entryForm = document.getElementById("entryForm");
const tableBody = document.getElementById("entriesTableBody");
const incomeTotalEl = document.getElementById("incomeTotal");
const expenseTotalEl = document.getElementById("expenseTotal");
const balanceTotalEl = document.getElementById("balanceTotal");
const savingsRateEl = document.getElementById("savingsRate");
const budgetInput = document.getElementById("budgetInput");
const saveBudgetBtn = document.getElementById("saveBudgetBtn");
const budgetStatus = document.getElementById("budgetStatus");
const budgetAlert = document.getElementById("budgetAlert");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const exportPdfBtn = document.getElementById("exportPdfBtn");
const clearBtn = document.getElementById("clearBtn");
const chartCanvas = document.getElementById("expenseChart");
const filterTypeEl = document.getElementById("filterType");
const filterCategoryEl = document.getElementById("filterCategory");
const dateInput = document.getElementById("date");
const typeInput = document.getElementById("type");
const descriptionInput = document.getElementById("description");
const categoryInput = document.getElementById("category");
const amountInput = document.getElementById("amount");

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP"
});

let entries = loadEntries();
let monthlyBudget = loadBudget();

if (dateInput) {
  dateInput.valueAsDate = new Date();
}

budgetInput.value = monthlyBudget || "";
render();

entryForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const description = descriptionInput.value.trim();
  const amount = Number(amountInput.value);
  const date = dateInput.value;

  if (!description) {
    alert("La descripción no puede estar vacía.");
    return;
  }

  if (Number.isNaN(amount) || amount <= 0) {
    alert("El monto debe ser mayor que 0.");
    return;
  }

  if (!date) {
    alert("Debes seleccionar una fecha.");
    return;
  }

  const newEntry = {
    id: crypto.randomUUID(),
    type: typeInput.value,
    description,
    category: categoryInput.value,
    amount,
    date
  };

  entries.unshift(newEntry);
  saveEntries();
  entryForm.reset();

  if (dateInput) {
    dateInput.valueAsDate = new Date();
  }

  render();
});

saveBudgetBtn.addEventListener("click", () => {
  const value = Number(budgetInput.value);

  if (Number.isNaN(value) || value <= 0) {
    budgetStatus.textContent = "Ingresa un presupuesto válido mayor que 0.";
    return;
  }

  monthlyBudget = value;
  localStorage.setItem(BUDGET_KEY, String(monthlyBudget));
  budgetStatus.textContent = `Presupuesto mensual guardado: ${currencyFormatter.format(monthlyBudget)}`;
  render();
});

exportCsvBtn.addEventListener("click", exportCSV);
exportPdfBtn.addEventListener("click", () => window.print());
filterTypeEl.addEventListener("change", renderTable);
filterCategoryEl.addEventListener("change", renderTable);

clearBtn.addEventListener("click", () => {
  const confirmClear = confirm("¿Seguro que deseas borrar todos los movimientos?");
  if (!confirmClear) {
    return;
  }

  entries = [];
  saveEntries();
  render();
});

function loadEntries() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadBudget() {
  const raw = localStorage.getItem(BUDGET_KEY);
  const parsed = raw ? Number(raw) : 0;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function render() {
  renderTable();
  renderSummary();
  renderChart();
}

function renderTable() {
  tableBody.innerHTML = "";

  const filterType = filterTypeEl.value;
  const filterCategory = filterCategoryEl.value;

  const filteredEntries = entries.filter((entry) => {
    const typeMatch = filterType === "all" || entry.type === filterType;
    const categoryMatch = filterCategory === "all" || entry.category === filterCategory;
    return typeMatch && categoryMatch;
  });

  if (!filteredEntries.length) {
    const emptyRow = document.createElement("tr");
    emptyRow.innerHTML = '<td colspan="6" class="muted">No hay movimientos con ese filtro.</td>';
    tableBody.appendChild(emptyRow);
    return;
  }

  filteredEntries.forEach((entry) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${entry.date}</td>
      <td class="type-${entry.type}">${entry.type === "income" ? "Ingreso" : "Gasto"}</td>
      <td>${escapeHtml(entry.description)}</td>
      <td>${entry.category}</td>
      <td>${currencyFormatter.format(entry.amount)}</td>
      <td><button data-id="${entry.id}" class="danger">Eliminar</button></td>
    `;

    row.querySelector("button").addEventListener("click", () => {
      entries = entries.filter((item) => item.id !== entry.id);
      saveEntries();
      render();
    });

    tableBody.appendChild(row);
  });
}

function renderSummary() {
  const income = entries
    .filter((item) => item.type === "income")
    .reduce((acc, item) => acc + item.amount, 0);

  const expense = entries
    .filter((item) => item.type === "expense")
    .reduce((acc, item) => acc + item.amount, 0);

  const balance = income - expense;
  const savingsRate = income > 0 ? ((balance / income) * 100).toFixed(1) : 0;

  incomeTotalEl.textContent = currencyFormatter.format(income);
  expenseTotalEl.textContent = currencyFormatter.format(expense);
  balanceTotalEl.textContent = currencyFormatter.format(balance);
  balanceTotalEl.style.color = balance >= 0 ? "var(--ok)" : "var(--danger)";
  savingsRateEl.textContent = `${savingsRate}%`;

  if (monthlyBudget > 0) {
    const ratio = (expense / monthlyBudget) * 100;
    budgetStatus.textContent = `Presupuesto actual: ${currencyFormatter.format(monthlyBudget)}`;

    budgetAlert.classList.remove("hidden", "warning", "danger");

    if (ratio >= 100) {
      budgetAlert.textContent = `🚨 Superaste tu presupuesto en ${currencyFormatter.format(expense - monthlyBudget)}.`;
      budgetAlert.classList.add("danger");
    } else if (ratio >= 80) {
      budgetAlert.textContent = `⚠️ Has usado ${ratio.toFixed(1)}% de tu presupuesto.`;
      budgetAlert.classList.add("warning");
    } else {
      budgetAlert.classList.add("hidden");
      budgetAlert.textContent = "";
    }
  } else {
    budgetStatus.textContent = "Define un presupuesto mensual para recibir alertas.";
    budgetAlert.classList.add("hidden");
  }
}

const categoryColors = {
  Salario: "#39d98a",
  Freelance: "#1ce2e7",
  Comida: "#ffb020",
  Transporte: "#7f5af0",
  Hogar: "#ff6b6b",
  Ocio: "#ffd166",
  Salud: "#4cc9f0",
  Otros: "#1ea7ff"
};

function renderChart() {
  const ctx = chartCanvas.getContext("2d");
  const width = chartCanvas.width;
  const height = chartCanvas.height;
  const padding = 30;

  ctx.clearRect(0, 0, width, height);

  const expenseByCategory = entries
    .filter((item) => item.type === "expense")
    .reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + item.amount;
      return acc;
    }, {});

  const categories = Object.keys(expenseByCategory);

  if (!categories.length) {
    ctx.fillStyle = "#8fb5cf";
    ctx.font = "16px sans-serif";
    ctx.fillText("Agrega gastos para visualizar la gráfica.", padding, height / 2);
    return;
  }

  const max = Math.max(...Object.values(expenseByCategory));
  const barAreaWidth = width - padding * 2;
  const gap = 20;
  const barWidth = Math.max(20, barAreaWidth / categories.length - gap);

  categories.forEach((category, index) => {
    const value = expenseByCategory[category];
    const barHeight = ((height - 80) * value) / max;
    const x = padding + index * (barWidth + gap);
    const y = height - 40 - barHeight;

    ctx.fillStyle = categoryColors[category] || "#1ea7ff";
    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.fillStyle = "#d8f1ff";
    ctx.font = "12px sans-serif";
    ctx.fillText(category, x, height - 15);

    ctx.fillStyle = "#8fd4ff";
    ctx.fillText(currencyFormatter.format(value), x, y - 8);
  });
}

function exportCSV() {
  if (!entries.length) {
    alert("No hay datos para exportar.");
    return;
  }

  const headers = ["fecha", "tipo", "descripcion", "categoria", "monto"];
  const rows = entries.map((item) => [
    item.date,
    item.type,
    escapeCsv(item.description),
    item.category,
    item.amount
  ]);

  const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "cashly-movimientos.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsv(value) {
  const escaped = String(value).replaceAll('"', '""');
  return `"${escaped}"`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
