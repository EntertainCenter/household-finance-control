// =========================================================
// HOME FINANCE MANAGEMENT
// MAIN APPLICATION
// =========================================================

const SUPABASE_URL =
  "https://lypfuqoxqxtdocgmryiy.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_R81PDNKu5TIet3zO8Qj0cA_ON7fDWIA";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


// =========================================================
// FORMAT MONEY
// =========================================================

function money(value) {

  const number = Number(value || 0);

  return number.toLocaleString("en-CA", {
    style: "currency",
    currency: "CAD"
  });
}


// =========================================================
// CHECK LOGIN
// =========================================================

async function checkLogin() {

  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  if (!session) {
    window.location.href = "login.html";
    return false;
  }

  return true;
}


// =========================================================
// LOAD MONTHLY SUMMARY
// =========================================================

async function loadSummary() {

  const { data, error } = await supabaseClient
    .from("vw_monthly_cashflow_summary")
    .select("*")
    .single();

  if (error) {
    console.error(error);

    document.getElementById("loadingMessage").textContent =
      "Unable to load financial summary: " + error.message;

    return;
  }


  document.getElementById("weeklySpending").textContent =
    money(data.current_weekly_spending_target);

  document.getElementById("baselineIncome").textContent =
    money(data.baseline_monthly_income);

  document.getElementById("mandatoryBills").textContent =
    money(data.mandatory_monthly_bills);

  document.getElementById("optionalBills").textContent =
    money(data.optional_monthly_bills);

  document.getElementById("monthlyResult").textContent =
    money(data.projected_monthly_surplus);

  document.getElementById("breakEvenWeekly").textContent =
    money(data.maximum_weekly_spending_before_surplus);


  document.getElementById("billsBalance").textContent =
    money(data.bills_account_balance);

  document.getElementById("spendingBalance").textContent =
    money(data.spending_account_balance);

  document.getElementById("savingsBalance").textContent =
    money(data.savings_balance);

  document.getElementById("billsFloor").textContent =
    money(data.bills_account_floor);

  document.getElementById("aboveFloor").textContent =
    money(data.bills_account_above_floor);

  document.getElementById("emergencyTarget").textContent =
    money(data.emergency_fund_target);


  updateStatus(data);

  document.getElementById("loadingMessage").classList.add("hidden");
  document.getElementById("statusSection").classList.remove("hidden");
  document.getElementById("mainDashboard").classList.remove("hidden");
  document.getElementById("accountsSection").classList.remove("hidden");
}


// =========================================================
// FINANCIAL STATUS
// =========================================================

function updateStatus(data) {

  const surplus = Number(data.projected_monthly_surplus);

  const indicator =
    document.getElementById("statusIndicator");

  const title =
    document.getElementById("statusTitle");

  const text =
    document.getElementById("statusText");


  if (surplus >= 250) {

    indicator.className =
      "status-indicator status-good";

    title.textContent =
      "Household plan is comfortably positive";

    text.textContent =
      `Projected baseline surplus is ${money(surplus)} per month before overtime or music income.`;

  }

  else if (surplus >= 0) {

    indicator.className =
      "status-indicator status-tight";

    title.textContent =
      "Household plan is positive but tight";

    text.textContent =
      `Projected baseline surplus is ${money(surplus)} per month. Extra income should be treated carefully.`;

  }

  else {

    indicator.className =
      "status-indicator status-danger";

    title.textContent =
      "Household plan is running short";

    text.textContent =
      `Projected baseline shortfall is ${money(Math.abs(surplus))} per month.`;

  }
}


// =========================================================
// LOAD DEBTS
// =========================================================

async function loadDebts() {

  const { data, error } = await supabaseClient
    .from("debts")
    .select(`
      debt_name,
      debt_type,
      current_balance,
      interest_rate,
      minimum_payment,
      payment_frequency,
      priority_order
    `)
    .eq("active", true)
    .order("priority_order", {
      ascending: true
    });


  if (error) {

    console.error(error);
    return;

  }


  const tbody =
    document.getElementById("debtTableBody");

  tbody.innerHTML = "";


  data.forEach(debt => {

    const row =
      document.createElement("tr");


    const rate =
      debt.interest_rate
        ? `${Number(debt.interest_rate).toFixed(2)}%`
        : "—";


    let payment = "—";

    if (debt.minimum_payment) {

      payment =
        `${money(debt.minimum_payment)} ${debt.payment_frequency || ""}`;

    }


    row.innerHTML = `
      <td>${debt.debt_name}</td>
      <td>${debt.debt_type || ""}</td>
      <td>${money(debt.current_balance)}</td>
      <td>${rate}</td>
      <td>${payment}</td>
    `;


    tbody.appendChild(row);

  });


  document
    .getElementById("debtSection")
    .classList
    .remove("hidden");
}


// =========================================================
// LOAD PAYMENTS ENDING SOON
// =========================================================

async function loadEndingSoon() {

  const today =
    new Date();

  const future =
    new Date();

  future.setMonth(
    future.getMonth() + 12
  );


  const todayText =
    today.toISOString().split("T")[0];

  const futureText =
    future.toISOString().split("T")[0];


  const { data, error } = await supabaseClient
    .from("bills")
    .select(`
      bill_name,
      amount,
      frequency,
      end_date
    `)
    .eq("active", true)
    .not("end_date", "is", null)
    .gte("end_date", todayText)
    .lte("end_date", futureText)
    .order("end_date");


  if (error) {

    console.error(error);
    return;

  }


  const container =
    document.getElementById("endingSoonContent");


  if (!data || data.length === 0) {

    container.innerHTML =
      "<p>No payments currently have an end date entered.</p>";

  }

  else {

    container.innerHTML = "";

    data.forEach(item => {

      const date =
        new Date(item.end_date + "T00:00:00");

      const block =
        document.createElement("div");

      block.className =
        "ending-item";

      block.innerHTML = `
        <strong>${item.bill_name}</strong>
        <span>
          ${money(item.amount)} ${item.frequency}
          ends
          ${date.toLocaleDateString("en-CA")}
        </span>
      `;

      container.appendChild(block);

    });

  }


  document
    .getElementById("endingSoonSection")
    .classList
    .remove("hidden");
}


// =========================================================
// LOGOUT
// =========================================================

document
  .getElementById("logoutBtn")
  .addEventListener("click", async () => {

    await supabaseClient.auth.signOut();

    window.location.href =
      "login.html";

  });


// =========================================================
// START APPLICATION
// =========================================================

async function startApp() {

  const loggedIn =
    await checkLogin();

  if (!loggedIn)
    return;


  await loadSummary();

  await loadDebts();

  await loadEndingSoon();

}


startApp();