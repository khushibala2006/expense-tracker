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
    const convertedAmount = (amount * rate).toFixed(2);
    if (currency === "USD") return `$${convertedAmount}`;
    return `₹${amount}`; // Default to INR
}

function renderExpenses() {

    expenseList.innerHTML = "";

    expenses.forEach((expense, index) => {

        const li = document.createElement("li");

        li.innerHTML = `
            ${expense.name} - ₹${expense.amount}
            <button class="delete-btn"
                data-index="${index}">
                Delete
            </button>
        `;

        expenseList.appendChild(li);
    });

    const { remainingBalance } = getFinancials();

    document.getElementById("total-salary").value = totalSalary;

    salaryDisplay.textContent = `₹${remainingBalance}`;

    updateChart();
    const warning = document.getElementById("warning");

if (remainingBalance <= totalSalary * 0.10) {

    salaryDisplay.style.color = "red";

    warning.textContent =

        "⚠ Warning! Balance is below 10%";

}

else{

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
    doc.text(`Total Salary: ₹${totalSalary}`, 20, y);

    y += 10;

    let totalExpenses = 0;

    expenses.forEach((expense) => {

        doc.text(
            `${expense.name} - ₹${expense.amount}`,
            20,
            y
        );

        totalExpenses += expense.amount;

        y += 10;
    });

    const remainingBalance =
        totalSalary - totalExpenses;

    y += 10;

    doc.text(
        `Remaining Balance: ₹${remainingBalance}`,
        20,
        y
    );

    doc.save("Expense_Report.pdf");
});
const currency = document.getElementById("currency");

currency.addEventListener("change", convertCurrency);

async function convertCurrency() {

    const targetCurrency = currency.value;
    const fromCurrency = "INR";

    const { remainingBalance } = getFinancials();

    if (targetCurrency === "INR") {

        salaryDisplay.textContent = `₹${remainingBalance}`;

        expenseList.innerHTML = "";

        expenses.forEach((expense, index) => {

            const li = document.createElement("li");

            li.innerHTML = `
                ${expense.name} - ₹${expense.amount}
                <button class="delete-btn" data-index="${index}">Delete</button>
            `;

            expenseList.appendChild(li);
        });

        return;
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

        if (!rate) {
            salaryDisplay.textContent = "Exchange rate not available";
            return;
        }

        salaryDisplay.textContent = formatCurrency(
            remainingBalance,
            targetCurrency,
            rate
        );

        expenseList.innerHTML = "";

        expenses.forEach((expense, index) => {

            const li = document.createElement("li");

            li.innerHTML = `
                ${expense.name} - ${formatCurrency(expense.amount, targetCurrency, rate)}
                <button class="delete-btn" data-index="${index}">Delete</button>
            `;

            expenseList.appendChild(li);
        });

    } catch (error) {

        salaryDisplay.textContent = "API Error";

        console.error("Currency conversion error:", error);
    }
}