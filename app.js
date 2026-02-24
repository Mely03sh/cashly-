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

const filterTypeEl = document.getElementById("filterType");
const filterCategoryEl = document.getElementById("filterCategory");

const clearBtn = document.getElementById("clearBtn");

const ctx = document.getElementById("expenseChart").getContext("2d");

let entries = JSON.parse(localStorage.getItem("entries")) || [];
let budget = Number(localStorage.getItem("budget")) || 0;
let chart;

/* =========================
   PRESUPUESTO
========================= */

function saveBudget() {
  budget = Number(budgetInput.value);

  if (!budget || budget <= 0) {
    alert("Ingresa un presupuesto válido.");
    return;
  }

  localStorage.setItem("budget", budget);
  budgetStatus.textContent = `Presupuesto mensual: $ ${budget.toLocaleString()}`;
  calculateTotals();
}

saveBudgetBtn.addEventListener("click", saveBudget);

if (budget > 0) {
  budgetStatus.textContent = `Presupuesto mensual: $ ${budget.toLocaleString()}`;
}

/* =========================
   FORMULARIO
========================= */

entryForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const newEntry = {
    id: crypto.randomUUID(),
    type: document.getElementById("type").value,
    description: document.getElementById("description").value.trim(),
    category: document.getElementById("category").value,
    amount: Number(document.getElementById("amount").value),
    date: document.getElementById("date").value,
  };

  if (!newEntry.description) {
    alert("La descripción no puede estar vacía.");
    return;
  }

  entries.push(newEntry);
  localStorage.setItem("entries", JSON.stringify(entries));

  entryForm.reset();

  renderTable();
  calculateTotals();
});

/* =========================
   TABLA + FILTROS
========================= */

function renderTable() {
  tableBody.innerHTML = "";

  const filterType = filterTypeEl.value;
  const filterCategory = filterCategoryEl.value;

  const filteredEntries = entries.filter((entry) => {
    const typeMatch = filterType === "all" || entry.type === filterType;
    const categoryMatch =
      filterCategory === "all" || entry.category === filterCategory;

    return typeMatch && categoryMatch;
  });

  if (!filteredEntries.length) {
    const emptyRow = document.createElement("tr");
    emptyRow.innerHTML =
      '<td colspan="6" class="muted">No hay movimientos con ese filtro.</td>';
    tableBody.appendChild(emptyRow);

    updateChart(filteredEntries);
    return;
  }

  filteredEntries.forEach((entry) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${entry.date}</td>
      <td>${entry.type === "income" ? "Ingreso" : "Gasto"}</td>
      <td>${entry.description}</td>
      <td>${entry.category}</td>
      <td>$ ${entry.amount.toLocaleString()}</td>
      <td><button onclick="deleteEntry('${entry.id}')">Eliminar</button></td>
    `;

    tableBody.appendChild(row);
  });

  updateChart(filteredEntries);
}

filterTypeEl.addEventListener("change", renderTable);
filterCategoryEl.addEventListener("change", renderTable);

/* =========================
   ELIMINAR
========================= */

function deleteEntry(id) {
  entries = entries.filter((entry) => entry.id !== id);
  localStorage.setItem("entries", JSON.stringify(entries));

  renderTable();
  calculateTotals();
}

/* =========================
   RESUMEN
========================= */

function calculateTotals() {
  const income = entries
    .filter((e) => e.type === "income")
    .reduce((sum, e) => sum + e.amount, 0);

  const expense = entries
    .filter((e) => e.type === "expense")
    .reduce((sum, e) => sum + e.amount, 0);

  const balance = income - expense;

  incomeTotalEl.textContent = `$ ${income.toLocaleString()}`;
  expenseTotalEl.textContent = `$ ${expense.toLocaleString()}`;
  balanceTotalEl.textContent = `$ ${balance.toLocaleString()}`;

  const rate = income ? ((balance / income) * 100).toFixed(1) : 0;
  savingsRateEl.textContent = `${rate}%`;

  if (budget > 0 && expense > budget) {
    budgetAlert.textContent = "⚠ Has superado tu presupuesto.";
    budgetAlert.classList.remove("hidden");
  } else {
    budgetAlert.classList.add("hidden");
  }

  updateChart(entries);
}

/* =========================
   GRÁFICA
========================= */

function updateChart(data) {
  const expenses = data.filter((e) => e.type === "expense");

  const totalsByCategory = {};

  expenses.forEach((e) => {
    totalsByCategory[e.category] =
      (totalsByCategory[e.category] || 0) + e.amount;
  });

  const labels = Object.keys(totalsByCategory);
  const values = Object.values(totalsByCategory);

  if (chart) {
    chart.destroy();
  }

  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Gastos",
          data: values,
        },
      ],
    },
  });
}

/* =========================
   BORRAR TODO
========================= */

clearBtn.addEventListener("click", () => {
  if (!confirm("¿Seguro que quieres borrar todo?")) return;

  entries = [];
  localStorage.removeItem("entries");

  renderTable();
  calculateTotals();
});

/* =========================
   INICIO
========================= */

renderTable();
calculateTotals();