const form = document.getElementById("expense-form");
const salaryDisplay = document.getElementById("salaryDisplay");
const expenseList = document.getElementById("expenseList");
const errorMessage = document.getElementById("error-message");

let totalSalary = Number(localStorage.getItem("totalSalary")) || 0;
let expenses = JSON.parse(localStorage.getItem("expenses")) || [];

let chart;

renderExpenses();

function saveData() {
    localStorage.setItem("totalSalary", totalSalary);
    localStorage.setItem("expenses", JSON.stringify(expenses));
}

form.addEventListener("submit", function (e) {
    e.preventDefault();

    const salaryInput = Number(
        document.getElementById("total-salary").value
    );

    const expenseName = document
        .getElementById("expense-name")
        .value.trim();

    const expenseAmount = Number(
        document.getElementById("expense-amount").value
    );

    // Validation
    if (
        salaryInput <= 0 ||
        expenseName === "" ||
        expenseAmount <= 0
    ) {
        errorMessage.textContent =
            "Please enter valid values.";
        return;
    }

    errorMessage.textContent = "";

    if (totalSalary === 0) {
    totalSalary = salaryInput;
    }

    // Check balance
    const totalExpenses = expenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
);

const remainingBalance = totalSalary - totalExpenses;

if (expenseAmount > remainingBalance) {
        errorMessage.textContent =
            "Expense exceeds remaining balance.";
        return;
    }

    expenses.push({
        name: expenseName,
        amount: expenseAmount,
    });

    saveData();
    renderExpenses();

    document.getElementById("expense-name").value = "";
    document.getElementById("expense-amount").value = "";
});

expenseList.addEventListener("click", function (e) {
    if (e.target.classList.contains("delete-btn")) {
        const index = e.target.dataset.index;

        expenses.splice(index, 1);

        saveData();
        renderExpenses();
    }
});
function updateChart() {
    const totalExpenses = expenses.reduce(
        (sum, expense) => sum + expense.amount,
        0
    );

    const remainingBalance = totalSalary - totalExpenses;

    const ctx = document.getElementById("expenseChart");

    if (chart) {
        chart.destroy();
    }

    chart = new Chart(ctx, {
        type: "pie",
        data: {
            labels: ["Remaining Balance", "Total Expenses"],
            datasets: [{
                data: [remainingBalance, totalExpenses]
            }]
        }
    });
}

function getFinancials() {
    const totalExpenses = expenses.reduce(
        (sum, expense) => sum + expense.amount,
        0
    );
    const remainingBalance = totalSalary - totalExpenses;
    return { totalExpenses, remainingBalance };
}

function formatCurrency(amount, currency, rate = 1) {
    const convertedAmount = (amount * rate);
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(convertedAmount);
}

function renderExpenses() {
    expenseList.innerHTML = "";

    const { remainingBalance, totalExpenses } = getFinancials();

    document.getElementById("total-salary").value = totalSalary;

    convertCurrency(); // Use convertCurrency to render with the correct currency

    updateChart();
    const warning = document.getElementById("warning");
    if (totalSalary > 0 && (remainingBalance / totalSalary) <= 0.10) {
        salaryDisplay.style.color = "red";
        warning.textContent = "⚠ Warning! Balance is below 10%";
    } else {
        salaryDisplay.style.color = "green";
        warning.textContent = "";
    }
}
const downloadBtn = document.getElementById("download-btn");

downloadBtn.addEventListener("click", function () {

    const { jsPDF } = window.jspdf;

    const doc = new jsPDF();

    let y = 20;

    doc.setFontSize(18);
    doc.text("Expense Report", 20, y);

    y += 15;

    doc.setFontSize(12);
    const selectedCurrency = currency.value;
    const financials = getFinancials();
    const totalSalaryText = `Total Salary: ${formatCurrency(totalSalary, selectedCurrency, 1)}`;
    doc.text(totalSalaryText, 20, y);

    y += 10;

    let totalExpenses = 0;
    const rate = window.currentExchangeRate || 1; // Use globally stored rate

    expenses.forEach((expense) => {
        doc.text(
            `${expense.name} - ${formatCurrency(expense.amount, selectedCurrency, rate)}`,
            20,
            y
        );
        totalExpenses += expense.amount;
        y += 10;
    });

    const remainingBalance =
        totalSalary - totalExpenses;

    doc.text(
        `Remaining Balance: ${formatCurrency(remainingBalance, selectedCurrency, 1)}`,
        20,
        y
    );

    doc.save("Expense_Report.pdf");
});
const currency = document.getElementById("currency");

currency.addEventListener("change", convertCurrency);

window.currentExchangeRate = 1; // Global variable to store the rate

async function convertCurrency() {

    const targetCurrency = currency.value;
    const fromCurrency = "INR";

    const { remainingBalance, totalExpenses } = getFinancials();

    if (targetCurrency === fromCurrency) {
        window.currentExchangeRate = 1;
        salaryDisplay.textContent = formatCurrency(remainingBalance, fromCurrency);
        renderExpenseList(fromCurrency);
        return; // Exit if no conversion is needed
    }

    try {
        const response = await fetch(

    `https://open.er-api.com/v6/latest/${fromCurrency}`

);

        if (!response.ok) {
            throw new Error("Failed to fetch exchange rate");
        }

        const data = await response.json();

        const rate = data.rates[targetCurrency];
        window.currentExchangeRate = rate; // Store the rate globally

        if (!rate) {
            salaryDisplay.textContent = "Exchange rate not available";
            return;
        }

        salaryDisplay.textContent = formatCurrency(
            remainingBalance,
            targetCurrency,
            rate
        );

        renderExpenseList(targetCurrency, rate);
    } catch (error) {
        salaryDisplay.textContent = "API Error";

        console.error("Currency conversion error:", error);
    }
}

function renderExpenseList(currency, rate = 1) {
    expenseList.innerHTML = "";
    expenses.forEach((expense, index) => {
        const li = document.createElement("li");
        li.innerHTML = `
            ${expense.name} - ${formatCurrency(expense.amount, currency, rate)}
            <button class="delete-btn" data-index="${index}">Delete</button>`;
        expenseList.appendChild(li);
    });
}