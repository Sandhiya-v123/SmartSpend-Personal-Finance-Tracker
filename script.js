/* =========================
   SMARTSPEND APPLICATION
========================= */

"use strict";

/* =========================
   ELEMENT SELECTORS
========================= */

const $ = (selector) => document.querySelector(selector);

const $$ = (selector) => document.querySelectorAll(selector);

const elements = {
  incomeTotal: $("#incomeTotal"),
  expenseTotal: $("#expenseTotal"),
  balanceTotal: $("#balanceTotal"),
  savingsRate: $("#savingsRate"),

  monthPicker: $("#monthPicker"),
  selectedMonthLabel: $("#selectedMonthLabel"),

  transactionModal: $("#transactionModal"),
  transactionForm: $("#transactionForm"),
  description: $("#description"),
  amount: $("#amount"),
  type: $("#type"),
  category: $("#category"),
  transactionDate: $("#transactionDate"),
  notes: $("#notes"),
  formError: $("#formError"),

  searchInput: $("#searchInput"),
  filterType: $("#filterType"),
  filterCategory: $("#filterCategory"),
  filterDate: $("#filterDate"),

  transactionTableBody: $("#transactionTableBody"),
  recentTableBody: $("#recentTableBody"),

  budgetAmount: $("#budgetAmount"),
  budgetAmountPage: $("#budgetAmountPage"),

  budgetProgress: $("#budgetProgress"),
  budgetPageProgress: $("#budgetPageProgress"),

  budgetLimitLabel: $("#budgetLimitLabel"),
  budgetSpentLabel: $("#budgetSpentLabel"),
  budgetRemainingLabel: $("#budgetRemainingLabel"),

  budgetPageLimit: $("#budgetPageLimit"),
  budgetPageSpent: $("#budgetPageSpent"),
  budgetPageLeft: $("#budgetPageLeft"),

  budgetForm: $("#budgetForm"),
  budgetFormPage: $("#budgetFormPage"),

  budgetMessage: $("#budgetMessage"),
  budgetPageMessage: $("#budgetPageMessage"),

  categoryBreakdown: $("#categoryBreakdown"),

  reportIncome: $("#reportIncome"),
  reportExpenses: $("#reportExpenses"),
  reportBalance: $("#reportBalance"),
  reportCount: $("#reportCount"),
  reportSubtitle: $("#reportSubtitle"),
  reportInsight: $("#reportInsight"),
  reportTableBody: $("#reportTableBody"),

  chartEmpty: $("#chartEmpty"),
  toast: $("#toast")
};

/* =========================
   APP DATA
========================= */

const STORAGE_KEY = "smartSpendTransactions";
const BUDGET_KEY = "smartSpendMonthlyBudget";
const THEME_KEY = "smartSpendTheme";

const today = getTodayDate();

let selectedMonth = today.slice(0, 7);
let editingId = null;
let expenseChart = null;
let toastTimer = null;

let transactions = loadTransactions();

let monthlyBudget = loadBudget();

/* =========================
   HELPER FUNCTIONS
========================= */

function getTodayDate() {
  const date = new Date();

  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[character];
  });
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(Number(amount) || 0);
}

function formatDate(dateString) {
  if (!dateString) return "—";

  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatMonth(monthString) {
  if (!monthString) return "";

  const [year, month] = monthString.split("-").map(Number);

  const date = new Date(year, month - 1, 1);

  return date.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric"
  });
}

function getMonthTransactions(month = selectedMonth) {
  return transactions.filter((transaction) => {
    return transaction.date.startsWith(month);
  });
}

function getExpenses(list) {
  return list.filter((transaction) => {
    return transaction.type === "expense";
  });
}

function getIncome(list) {
  return list.filter((transaction) => {
    return transaction.type === "income";
  });
}

function sumTransactions(list) {
  return list.reduce((total, transaction) => {
    return total + Number(transaction.amount || 0);
  }, 0);
}

function getTotalIncome(list) {
  return sumTransactions(getIncome(list));
}

function getTotalExpenses(list) {
  return sumTransactions(getExpenses(list));
}

function getBalance(list) {
  return getTotalIncome(list) - getTotalExpenses(list);
}

/* =========================
   LOCAL STORAGE
========================= */

function loadTransactions() {
  try {
    const savedData = localStorage.getItem(STORAGE_KEY);

    if (!savedData) return [];

    const parsedData = JSON.parse(savedData);

    if (!Array.isArray(parsedData)) return [];

    return parsedData.filter((item) => {
      return (
        item &&
        typeof item.id === "string" &&
        typeof item.description === "string" &&
        Number.isFinite(Number(item.amount)) &&
        Number(item.amount) > 0 &&
        ["income", "expense"].includes(item.type) &&
        typeof item.date === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(item.date)
      );
    });
  } catch (error) {
    console.error("Unable to load saved transactions:", error);

    return [];
  }
}

function saveTransactions() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(transactions)
    );

    return true;
  } catch (error) {
    console.error("Unable to save transactions:", error);

    showToast("Unable to save data in this browser.");

    return false;
  }
}

function loadBudget() {
  try {
    const savedBudget = Number(localStorage.getItem(BUDGET_KEY));

    if (Number.isFinite(savedBudget) && savedBudget > 0) {
      return savedBudget;
    }
  } catch (error) {
    console.error("Unable to load budget:", error);
  }

  return 0;
}

function saveBudget() {
  try {
    localStorage.setItem(BUDGET_KEY, String(monthlyBudget));

    return true;
  } catch (error) {
    console.error("Unable to save budget:", error);

    showToast("Unable to save your budget.");

    return false;
  }
}

/* =========================
   TOAST NOTIFICATION
========================= */

function showToast(message) {
  if (!elements.toast) return;

  elements.toast.textContent = message;

  elements.toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    elements.toast.classList.remove("show");
  }, 2800);
}

/* =========================
   NAVIGATION
========================= */

function setupNavigation() {
  $$(".nav-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const sectionName = button.dataset.section;

      if (!sectionName) return;

      $$(".nav-btn").forEach((navButton) => {
        navButton.classList.toggle(
          "active",
          navButton === button
        );
      });

      $$(".page-section").forEach((section) => {
        section.classList.toggle(
          "hidden",
          section.id !== sectionName
        );
      });

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    });
  });
}

/* =========================
   MONTH PICKER
========================= */

function setupMonthPicker() {
  if (!elements.monthPicker) return;

  elements.monthPicker.value = selectedMonth;

  elements.monthPicker.addEventListener("change", () => {
    if (!elements.monthPicker.value) return;

    selectedMonth = elements.monthPicker.value;

    renderApp();
  });
}

/* =========================
   MODAL MANAGEMENT
========================= */

function openModal(transaction = null) {
  if (!elements.transactionModal) return;

  elements.transactionForm.reset();

  elements.formError?.classList.add("hidden");

  editingId = transaction ? transaction.id : null;

  const modalTitle = $("#modalTitle");

  if (modalTitle) {
    modalTitle.textContent = transaction
      ? "Edit Transaction"
      : "Add Transaction";
  }

  if (transaction) {
    elements.description.value = transaction.description;

    elements.amount.value = transaction.amount;

    elements.type.value = transaction.type;

    elements.category.value = transaction.category;

    elements.transactionDate.value = transaction.date;

    elements.notes.value = transaction.notes || "";
  } else {
    elements.type.value = "expense";

    elements.transactionDate.value = today;
  }

  updateCategoryOptions();

  elements.transactionModal.classList.remove("hidden");

  document.body.style.overflow = "hidden";

  setTimeout(() => {
    elements.description?.focus();
  }, 50);
}

function closeModal() {
  if (!elements.transactionModal) return;

  elements.transactionModal.classList.add("hidden");

  document.body.style.overflow = "";

  editingId = null;

  elements.formError?.classList.add("hidden");
}

function setupModal() {
  $$("[data-open-modal]").forEach((button) => {
    button.addEventListener("click", () => {
      openModal();
    });
  });

  $("#openModal")?.addEventListener("click", () => {
    openModal();
  });

  $("#closeModal")?.addEventListener("click", closeModal);

  $("#cancelModal")?.addEventListener("click", closeModal);

  elements.transactionModal?.addEventListener("click", (event) => {
    if (event.target === elements.transactionModal) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModal();
    }
  });
}

/* =========================
   CATEGORY OPTIONS
========================= */

const expenseCategories = [
  "Food",
  "Transport",
  "Shopping",
  "Bills",
  "Entertainment",
  "Health",
  "Education",
  "Rent",
  "Travel",
  "Other"
];

const incomeCategories = [
  "Salary",
  "Freelance",
  "Business",
  "Investment",
  "Gift",
  "Other"
];

function updateCategoryOptions() {
  if (!elements.category) return;

  const previousValue = elements.category.value;

  const categories =
    elements.type.value === "income"
      ? incomeCategories
      : expenseCategories;

  elements.category.innerHTML = categories
    .map((category) => {
      return `
        <option value="${escapeHTML(category)}">
          ${escapeHTML(category)}
        </option>
      `;
    })
    .join("");

  if (categories.includes(previousValue)) {
    elements.category.value = previousValue;
  }
}

/* =========================
   ADD / EDIT TRANSACTION
========================= */

function setupTransactionForm() {
  elements.type?.addEventListener("change", () => {
    updateCategoryOptions();
  });

  elements.transactionForm?.addEventListener("submit", (event) => {
    event.preventDefault();

    const description = elements.description.value.trim();

    const amount = Number(elements.amount.value);

    const type = elements.type.value;

    const category = elements.category.value;

    const date = elements.transactionDate.value;

    const notes = elements.notes.value.trim();

    if (!description) {
      showFormError("Please enter a description.");

      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      showFormError("Enter an amount greater than zero.");

      return;
    }

    if (amount > 1000000000000) {
      showFormError("Please enter a smaller amount.");

      return;
    }

    if (!["income", "expense"].includes(type)) {
      showFormError("Please select a valid transaction type.");

      return;
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      showFormError("Please select a valid date.");

      return;
    }

    const transactionData = {
      id: editingId || createId(),
      description,
      amount,
      type,
      category,
      date,
      notes
    };

    const oldTransactions = [...transactions];

    if (editingId) {
      transactions = transactions.map((transaction) => {
        return transaction.id === editingId
          ? transactionData
          : transaction;
      });
    } else {
      transactions.push(transactionData);
    }

    const saved = saveTransactions();

    if (!saved) {
      transactions = oldTransactions;

      return;
    }

    selectedMonth = date.slice(0, 7);

    if (elements.monthPicker) {
      elements.monthPicker.value = selectedMonth;
    }

    closeModal();

    renderApp();

    showToast(
      editingId
        ? "Transaction updated successfully!"
        : "Transaction added successfully!"
    );
  });
}

function showFormError(message) {
  if (!elements.formError) return;

  elements.formError.textContent = message;

  elements.formError.classList.remove("hidden");
}

/* =========================
   DASHBOARD SUMMARY
========================= */

function renderSummary() {
  const monthTransactions = getMonthTransactions();

  const income = getTotalIncome(monthTransactions);

  const expenses = getTotalExpenses(monthTransactions);

  const balance = income - expenses;

  const savingsRate =
    income > 0
      ? ((balance / income) * 100)
      : 0;

  if (elements.incomeTotal) {
    elements.incomeTotal.textContent = formatCurrency(income);
  }

  if (elements.expenseTotal) {
    elements.expenseTotal.textContent = formatCurrency(expenses);
  }

  if (elements.balanceTotal) {
    elements.balanceTotal.textContent = formatCurrency(balance);
  }

  if (elements.savingsRate) {
    elements.savingsRate.textContent =
      `${savingsRate.toFixed(1)}%`;
  }

  if (elements.selectedMonthLabel) {
    elements.selectedMonthLabel.textContent =
      formatMonth(selectedMonth);
  }
}

/* =========================
   TRANSACTION TABLE
========================= */

function createTransactionRow(transaction, includeActions = true) {
  const typeClass =
    transaction.type === "income"
      ? "income"
      : "expense";

  const sign =
    transaction.type === "income"
      ? "+"
      : "−";

  const description = escapeHTML(transaction.description);

  const category = escapeHTML(transaction.category);

  const notes = escapeHTML(transaction.notes || "");

  const amount = formatCurrency(transaction.amount);

  const date = formatDate(transaction.date);

  return `
    <tr>
      <td>
        <div class="transaction-description">
          ${description}
        </div>

        ${
          notes
            ? `<div class="transaction-notes">${notes}</div>`
            : ""
        }
      </td>

      <td>${date}</td>

      <td>
        <span class="category-badge">
          ${category}
        </span>
      </td>

      <td>
        <span class="type-badge ${typeClass}">
          ${transaction.type === "income" ? "Income" : "Expense"}
        </span>
      </td>

      <td class="amount-${typeClass}">
        ${sign}${amount}
      </td>

      ${
        includeActions
          ? `
            <td>
              <div class="action-buttons">
                <button
                  type="button"
                  class="icon-action"
                  data-action="edit"
                  data-id="${escapeHTML(transaction.id)}"
                  aria-label="Edit ${description}"
                  title="Edit"
                >
                  ✎
                </button>

                <button
                  type="button"
                  class="icon-action delete"
                  data-action="delete"
                  data-id="${escapeHTML(transaction.id)}"
                  aria-label="Delete ${description}"
                  title="Delete"
                >
                  🗑
                </button>
              </div>
            </td>
          `
          : ""
      }
    </tr>
  `;
}

function renderRecentTransactions() {
  if (!elements.recentTableBody) return;

  const monthTransactions = getMonthTransactions()
    .sort((a, b) => {
      return (
        b.date.localeCompare(a.date) ||
        b.id.localeCompare(a.id)
      );
    })
    .slice(0, 5);

  elements.recentTableBody.innerHTML = monthTransactions
    .map((transaction) => {
      return createTransactionRow(transaction, false);
    })
    .join("");

  const emptyMessage = $("#recentEmpty");

  if (emptyMessage) {
    emptyMessage.classList.toggle(
      "hidden",
      monthTransactions.length > 0
    );
  }
}

/* =========================
   SEARCH AND FILTERS
========================= */

function getFilteredTransactions() {
  const searchText =
    elements.searchInput?.value.trim().toLowerCase() || "";

  const selectedType =
    elements.filterType?.value || "all";

  const selectedCategory =
    elements.filterCategory?.value || "all";

  const selectedDate =
    elements.filterDate?.value || "";

  return getMonthTransactions()
    .filter((transaction) => {
      const searchableText = [
        transaction.description,
        transaction.category,
        transaction.notes
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !searchText ||
        searchableText.includes(searchText);

      const matchesType =
        selectedType === "all" ||
        transaction.type === selectedType;

      const matchesCategory =
        selectedCategory === "all" ||
        transaction.category === selectedCategory;

      const matchesDate =
        !selectedDate ||
        transaction.date === selectedDate;

      return (
        matchesSearch &&
        matchesType &&
        matchesCategory &&
        matchesDate
      );
    })
    .sort((a, b) => {
      return (
        b.date.localeCompare(a.date) ||
        b.id.localeCompare(a.id)
      );
    });
}

function populateFilterCategories() {
  if (!elements.filterCategory) return;

  const currentValue = elements.filterCategory.value;

  const categories = [
    ...new Set(
      getMonthTransactions()
        .map((transaction) => transaction.category)
        .filter(Boolean)
    )
  ].sort();

  elements.filterCategory.innerHTML = `
    <option value="all">All Categories</option>

    ${categories
      .map((category) => {
        return `
          <option value="${escapeHTML(category)}">
            ${escapeHTML(category)}
          </option>
        `;
      })
      .join("")}
  `;

  if (categories.includes(currentValue)) {
    elements.filterCategory.value = currentValue;
  }
}

function renderTransactions() {
  if (!elements.transactionTableBody) return;

  const filteredTransactions = getFilteredTransactions();

  elements.transactionTableBody.innerHTML =
    filteredTransactions
      .map((transaction) => {
        return createTransactionRow(transaction, true);
      })
      .join("");

  const emptyMessage = $("#transactionEmpty");

  if (emptyMessage) {
    emptyMessage.classList.toggle(
      "hidden",
      filteredTransactions.length > 0
    );
  }
}

function setupFilters() {
  [
    elements.searchInput,
    elements.filterType,
    elements.filterCategory,
    elements.filterDate
  ].forEach((element) => {
    element?.addEventListener("input", renderTransactions);

    element?.addEventListener("change", renderTransactions);
  });

  $("#clearFilters")?.addEventListener("click", () => {
    if (elements.searchInput) {
      elements.searchInput.value = "";
    }

    if (elements.filterType) {
      elements.filterType.value = "all";
    }

    if (elements.filterDate) {
      elements.filterDate.value = "";
    }

    if (elements.filterCategory) {
      elements.filterCategory.value = "all";
    }

    renderTransactions();
  });
}

/* =========================
   EDIT AND DELETE
========================= */

function setupTransactionActions() {
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");

    if (!button) return;

    const transactionId = button.dataset.id;

    const action = button.dataset.action;

    const transaction = transactions.find((item) => {
      return item.id === transactionId;
    });

    if (!transaction) return;

    if (action === "edit") {
      openModal(transaction);

      return;
    }

    if (action === "delete") {
      const confirmed = window.confirm(
        `Delete "${transaction.description}"?`
      );

      if (!confirmed) return;

      const oldTransactions = [...transactions];

      transactions = transactions.filter((item) => {
        return item.id !== transactionId;
      });

      if (!saveTransactions()) {
        transactions = oldTransactions;

        return;
      }

      renderApp();

      showToast("Transaction deleted.");
    }
  });
}

/* =========================
   MONTHLY BUDGET
========================= */

function renderBudget() {
  const monthExpenses = getTotalExpenses(
    getMonthTransactions()
  );

  const budget = monthlyBudget;

  const remaining = budget - monthExpenses;

  const percentage =
    budget > 0
      ? (monthExpenses / budget) * 100
      : 0;

  const progress = Math.min(percentage, 100);

  const progressClass =
    percentage >= 100
      ? "danger"
      : percentage >= 80
        ? "warning"
        : "";

  [
    elements.budgetLimitLabel,
    elements.budgetPageLimit
  ].forEach((element) => {
    if (element) {
      element.textContent = formatCurrency(budget);
    }
  });

  [
    elements.budgetSpentLabel,
    elements.budgetPageSpent
  ].forEach((element) => {
    if (element) {
      element.textContent = formatCurrency(monthExpenses);
    }
  });

  [
    elements.budgetRemainingLabel,
    elements.budgetPageLeft
  ].forEach((element) => {
    if (element) {
      element.textContent = formatCurrency(remaining);
    }
  });

  [
    elements.budgetProgress,
    elements.budgetPageProgress
  ].forEach((element) => {
    if (!element) return;

    element.style.width = `${progress}%`;

    element.classList.remove("warning", "danger");

    if (progressClass) {
      element.classList.add(progressClass);
    }

    element.setAttribute(
      "aria-valuenow",
      String(Math.round(progress))
    );

    element.setAttribute("aria-valuemin", "0");

    element.setAttribute("aria-valuemax", "100");
  });

  if (budget > 0 && monthExpenses > budget) {
    setBudgetMessage(
      "You have exceeded your monthly budget.",
      true
    );
  } else if (budget > 0 && percentage >= 80) {
    setBudgetMessage(
      "You are close to your monthly budget limit.",
      false
    );
  } else if (budget > 0) {
    setBudgetMessage(
      "You are within your budget. Keep it up!",
      false
    );
  } else {
    setBudgetMessage(
      "Set a monthly budget to track your spending.",
      false
    );
  }
}

function setBudgetMessage(message, isError) {
  [
    elements.budgetMessage,
    elements.budgetPageMessage
  ].forEach((element) => {
    if (!element) return;

    element.textContent = message;

    element.classList.toggle("error", isError);

    element.classList.toggle("success", !isError);
  });
}

function setupBudgetForms() {
  const forms = [
    elements.budgetForm,
    elements.budgetFormPage
  ].filter(Boolean);

  forms.forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const input = form.querySelector('input[type="number"]');

      const value = Number(input?.value);

      if (!Number.isFinite(value) || value <= 0) {
        setBudgetMessage(
          "Enter a budget amount greater than zero.",
          true
        );

        return;
      }

      if (value > 1000000000000) {
        setBudgetMessage(
          "Please enter a smaller budget amount.",
          true
        );

        return;
      }

      const previousBudget = monthlyBudget;

      monthlyBudget = value;

      if (!saveBudget()) {
        monthlyBudget = previousBudget;

        return;
      }

      if (elements.budgetAmount) {
        elements.budgetAmount.value = "";
      }

      if (elements.budgetAmountPage) {
        elements.budgetAmountPage.value = "";
      }

      renderBudget();

      showToast("Monthly budget updated!");
    });
  });
}

/* =========================
   EXPENSE CHART
========================= */

function renderChart() {
  const canvas = $("#expenseChart");

  if (!canvas) return;

  const expenses = getExpenses(
    getMonthTransactions()
  );

  const categoryTotals = {};

  expenses.forEach((transaction) => {
    const category = transaction.category || "Other";

    categoryTotals[category] =
      (categoryTotals[category] || 0) +
      Number(transaction.amount);
  });

  const labels = Object.keys(categoryTotals);

  const values = Object.values(categoryTotals);

  if (elements.chartEmpty) {
    elements.chartEmpty.classList.toggle(
      "hidden",
      values.length > 0
    );
  }

  if (typeof Chart === "undefined") {
    if (elements.chartEmpty) {
      elements.chartEmpty.textContent =
        "Chart library could not be loaded.";
      elements.chartEmpty.classList.remove("hidden");
    }

    return;
  }

  if (expenseChart) {
    expenseChart.destroy();

    expenseChart = null;
  }

  const isDark = document.body.classList.contains("dark-theme");

  const textColor = isDark ? "#f0f1f8" : "#20243a";

  const gridColor = isDark ? "#32354a" : "#e9eaf1";

  expenseChart = new Chart(canvas, {
    type: "doughnut",

    data: {
      labels,

      datasets: [
        {
          data: values,

          backgroundColor: [
            "#6558f5",
            "#16a879",
            "#e45468",
            "#e99b35",
            "#3998db",
            "#a46de2",
            "#36b6b0",
            "#e77fae",
            "#9aab44",
            "#8b95a7"
          ],

          borderWidth: 2,

          borderColor: isDark ? "#1e2030" : "#ffffff",

          hoverOffset: 7
        }
      ]
    },

    options: {
      responsive: true,

      maintainAspectRatio: false,

      cutout: "65%",

      plugins: {
        legend: {
          position: "bottom",

          labels: {
            color: textColor,

            padding: 16,

            usePointStyle: true,

            pointStyle: "circle"
          }
        },

        tooltip: {
          callbacks: {
            label(context) {
              return `${context.label}: ${formatCurrency(context.raw)}`;
            }
          }
        }
      },

      animation: {
        duration: 500
      }
    }
  });

  if (values.length === 0 && elements.chartEmpty) {
    elements.chartEmpty.textContent =
      "No expenses recorded for this month.";
  }
}

/* =========================
   CATEGORY BREAKDOWN
========================= */

function renderCategoryBreakdown() {
  if (!elements.categoryBreakdown) return;

  const expenses = getExpenses(
    getMonthTransactions()
  );

  const categoryTotals = {};

  expenses.forEach((transaction) => {
    const category = transaction.category || "Other";

    categoryTotals[category] =
      (categoryTotals[category] || 0) +
      Number(transaction.amount);
  });

  const sortedCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1]);

  const totalExpenses = sumTransactions(expenses);

  if (sortedCategories.length === 0) {
    elements.categoryBreakdown.innerHTML = `
      <p class="empty-message">
        No expense data available for this month.
      </p>
    `;

    return;
  }

  elements.categoryBreakdown.innerHTML =
    sortedCategories
      .map(([category, amount]) => {
        const percentage =
          totalExpenses > 0
            ? (amount / totalExpenses) * 100
            : 0;

        return `
          <div class="category-row">

            <div class="category-row-top">
              <span>${escapeHTML(category)}</span>

              <span>
                ${formatCurrency(amount)}
                · ${percentage.toFixed(1)}%
              </span>
            </div>

            <div class="category-progress">
              <div style="width: ${percentage}%"></div>
            </div>

          </div>
        `;
      })
      .join("");
}

/* =========================
   REPORTS
========================= */

function renderReports() {
  const monthTransactions = getMonthTransactions();

  const income = getTotalIncome(monthTransactions);

  const expenses = getTotalExpenses(monthTransactions);

  const balance = income - expenses;

  if (elements.reportIncome) {
    elements.reportIncome.textContent = formatCurrency(income);
  }

  if (elements.reportExpenses) {
    elements.reportExpenses.textContent = formatCurrency(expenses);
  }

  if (elements.reportBalance) {
    elements.reportBalance.textContent = formatCurrency(balance);
  }

  if (elements.reportCount) {
    elements.reportCount.textContent =
      String(monthTransactions.length);
  }

  if (elements.reportSubtitle) {
    elements.reportSubtitle.textContent =
      `Report for ${formatMonth(selectedMonth)}`;
  }

  if (elements.reportInsight) {
    if (monthTransactions.length === 0) {
      elements.reportInsight.textContent =
        "Add transactions to see your monthly financial insights.";
    } else if (balance > 0) {
      elements.reportInsight.textContent =
        `You have a positive balance of ${formatCurrency(balance)} this month. Keep tracking your spending and savings.`;
    } else if (balance < 0) {
      elements.reportInsight.textContent =
        `Your expenses are higher than your income by ${formatCurrency(Math.abs(balance))}. Review your spending categories and budget.`;
    } else {
      elements.reportInsight.textContent =
        "Your income and expenses are equal for this month.";
    }
  }

  if (elements.reportTableBody) {
    const sortedTransactions = [...monthTransactions].sort(
      (a, b) => b.date.localeCompare(a.date)
    );

    elements.reportTableBody.innerHTML =
      sortedTransactions
        .map((transaction) => {
          return createTransactionRow(transaction, false);
        })
        .join("");

    const reportEmpty = $("#reportEmpty");

    if (reportEmpty) {
      reportEmpty.classList.toggle(
        "hidden",
        sortedTransactions.length > 0
      );
    }
  }
}

/* =========================
   CSV EXPORT
========================= */

function downloadCSV(filename, rows) {
  if (!rows.length) {
    showToast("There is no data to export.");

    return;
  }

  const csvContent = rows
    .map((row) => {
      return row
        .map((value) => {
          let safeValue = String(value ?? "");

          // Prevent spreadsheet formula injection.
          if (/^[\s]*[=+\-@]/.test(safeValue)) {
            safeValue = "'" + safeValue;
          }

          return `"${safeValue.replace(/"/g, '""')}"`;
        })
        .join(",");
    })
    .join("\r\n");

  const blob = new Blob(
    ["\uFEFF" + csvContent],
    {
      type: "text/csv;charset=utf-8;"
    }
  );

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;

  link.download = filename;

  document.body.appendChild(link);

  link.click();

  link.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);

  showToast("CSV file exported successfully!");
}

function createCSVRows(list) {
  const header = [
    "Date",
    "Description",
    "Type",
    "Category",
    "Amount",
    "Notes"
  ];

  const data = list.map((transaction) => {
    return [
      transaction.date,
      transaction.description,
      transaction.type,
      transaction.category,
      transaction.amount,
      transaction.notes || ""
    ];
  });

  return [header, ...data];
}

function setupCSVExport() {
  $("#exportCsv")?.addEventListener("click", () => {
    const filteredTransactions = getFilteredTransactions();

    downloadCSV(
      `SmartSpend-Transactions-${selectedMonth}.csv`,
      createCSVRows(filteredTransactions)
    );
  });

  $("#exportReportCsv")?.addEventListener("click", () => {
    const monthTransactions = getMonthTransactions();

    downloadCSV(
      `SmartSpend-Report-${selectedMonth}.csv`,
      createCSVRows(monthTransactions)
    );
  });
}

/* =========================
   DARK MODE
========================= */

function setupTheme() {
  let savedTheme = "light";

  try {
    savedTheme = localStorage.getItem(THEME_KEY) || "light";
  } catch (error) {
    console.error("Unable to read theme setting:", error);
  }

  applyTheme(savedTheme === "dark");

  $("#themeToggle")?.addEventListener("click", () => {
    const isDark = !document.body.classList.contains("dark-theme");

    applyTheme(isDark);

    try {
      localStorage.setItem(
        THEME_KEY,
        isDark ? "dark" : "light"
      );
    } catch (error) {
      console.error("Unable to save theme setting:", error);
    }
  });
}

function applyTheme(isDark) {
  document.body.classList.toggle("dark-theme", isDark);

  const button = $("#themeToggle");

  if (button) {
    button.textContent = isDark ? "☀️" : "🌙";

    button.setAttribute(
      "aria-label",
      isDark ? "Switch to light mode" : "Switch to dark mode"
    );

    button.title = isDark
      ? "Switch to light mode"
      : "Switch to dark mode";
  }

  if (expenseChart) {
    renderChart();
  }
}

/* =========================
   APP RENDER
========================= */

function renderApp() {
  renderSummary();

  populateFilterCategories();

  renderRecentTransactions();

  renderTransactions();

  renderBudget();

  renderChart();

  renderCategoryBreakdown();

  renderReports();
}

/* =========================
   INITIALIZE APP
========================= */

function initializeApp() {
  setupNavigation();

  setupMonthPicker();

  setupModal();

  setupTransactionForm();

  setupFilters();

  setupTransactionActions();

  setupBudgetForms();

  setupCSVExport();

  setupTheme();

  renderApp();
}

document.addEventListener("DOMContentLoaded", initializeApp);