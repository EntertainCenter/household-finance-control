(() => {

  // =====================================================
  // PRIVATE DASHBOARD SUPABASE CLIENT
  // =====================================================

  const DASHBOARD_SUPABASE_URL =
    "https://lypfuqoxqxtdocgmryiy.supabase.co";

  const DASHBOARD_SUPABASE_KEY =
    "sb_publishable_R81PDNKu5TIet3zO8Qj0cA_ON7fDWIA";


  const dashboardSupabase =
    supabase.createClient(
      DASHBOARD_SUPABASE_URL,
      DASHBOARD_SUPABASE_KEY
    );


  // =====================================================
  // FORMAT MONEY
  // =====================================================

  function money(value) {

    return Number(
      value || 0
    ).toLocaleString(
      "en-CA",
      {
        style: "currency",
        currency: "CAD"
      }
    );

  }


  // =====================================================
  // LOCAL DATE
  // =====================================================

  function localISO(date) {

    const year =
      date.getFullYear();

    const month =
      String(
        date.getMonth() + 1
      ).padStart(
        2,
        "0"
      );

    const day =
      String(
        date.getDate()
      ).padStart(
        2,
        "0"
      );

    return `${year}-${month}-${day}`;

  }


  function todayISO() {

    return localISO(
      new Date()
    );

  }


  function futureISO(days) {

    const date =
      new Date();

    date.setDate(
      date.getDate() + days
    );

    return localISO(
      date
    );

  }


  function prettyDate(value) {

    if (!value) {
      return "—";
    }


    const date =
      new Date(
        value + "T00:00:00"
      );


    return date.toLocaleDateString(
      "en-CA",
      {
        month: "short",
        day: "numeric",
        year: "numeric"
      }
    );

  }


  function addDays(
    dateString,
    days
  ) {

    const date =
      new Date(
        dateString + "T00:00:00"
      );

    date.setDate(
      date.getDate() + days
    );

    return localISO(
      date
    );

  }


  function addMonths(
    dateString,
    months,
    dueDay
  ) {

    const date =
      new Date(
        dateString + "T00:00:00"
      );


    date.setMonth(
      date.getMonth() + months
    );


    if (dueDay) {

      const lastDay =
        new Date(
          date.getFullYear(),
          date.getMonth() + 1,
          0
        ).getDate();


      date.setDate(
        Math.min(
          dueDay,
          lastDay
        )
      );

    }


    return localISO(
      date
    );

  }


  // =====================================================
  // BILL OCCURRENCES
  // =====================================================

  function buildBillOccurrences(
    bill,
    startDate,
    endDate
  ) {

    const results = [];


    if (
      !bill.active ||
      !bill.next_due_date
    ) {

      return results;

    }


    let current =
      bill.next_due_date;


    let safety =
      0;


    while (
      current <= endDate &&
      safety < 100
    ) {

      safety++;


      if (
        current >= startDate &&
        (
          !bill.end_date ||
          current <= bill.end_date
        )
      ) {

        let amount =
          Number(
            bill.amount || 0
          );


        if (
          bill.end_date &&
          current === bill.end_date &&
          bill.final_payment_amount !== null
        ) {

          amount =
            Number(
              bill.final_payment_amount
            );

        }


        results.push({

          date:
            current,

          name:
            bill.bill_name,

          amount:
            amount

        });

      }


      if (
        bill.end_date &&
        current >= bill.end_date
      ) {

        break;

      }


      const frequency =
        (
          bill.frequency || ""
        ).toLowerCase();


      if (
        frequency === "weekly"
      ) {

        current =
          addDays(
            current,
            7
          );

      }

      else if (
        frequency === "biweekly"
      ) {

        current =
          addDays(
            current,
            14
          );

      }

      else if (
        frequency === "semi-monthly"
      ) {

        current =
          addDays(
            current,
            15
          );

      }

      else if (
        frequency === "monthly"
      ) {

        current =
          addMonths(
            current,
            1,
            bill.due_day
          );

      }

      else if (
        frequency === "quarterly"
      ) {

        current =
          addMonths(
            current,
            3,
            bill.due_day
          );

      }

      else if (
        frequency === "annual"
      ) {

        current =
          addMonths(
            current,
            12,
            bill.due_day
          );

      }

      else {

        break;

      }

    }


    return results;

  }


  // =====================================================
  // MAIN
  // =====================================================

  async function loadTodayDashboard() {

    const today =
      todayISO();


    const sevenDays =
      futureISO(
        7
      );


    const sixtyDays =
      futureISO(
        60
      );


    const [
      accountsResult,
      settingsResult,
      billsResult,
      incomeResult,
      incomeSourcesResult,
      transfersResult,
      checkinResult
    ] =
      await Promise.all([


        dashboardSupabase
          .from("accounts")
          .select(`
            account_name,
            current_balance,
            protected_floor,
            active
          `)
          .eq(
            "active",
            true
          ),


        dashboardSupabase
          .from("finance_settings")
          .select(`
            bills_account_floor,
            weekly_spending_target
          `)
          .single(),


        dashboardSupabase
          .from("bills")
          .select(`
            bill_name,
            amount,
            frequency,
            due_day,
            next_due_date,
            end_date,
            final_payment_amount,
            active
          `)
          .eq(
            "active",
            true
          ),


        dashboardSupabase
          .from("income_occurrences")
          .select(`
            expected_date,
            expected_amount,
            actual_amount,
            received,
            income_source_id
          `)
          .lte(
            "expected_date",
            sixtyDays
          )
          .order(
            "expected_date",
            {
              ascending: true
            }
          ),


        dashboardSupabase
          .from("income_sources")
          .select(`
            id,
            source_name
          `),


        dashboardSupabase
          .from("spending_transfers")
          .select(`
            transfer_date,
            amount,
            status
          `)
          .gte(
            "transfer_date",
            today
          )
          .lte(
            "transfer_date",
            sixtyDays
          ),


        dashboardSupabase
          .from("account_checkins")
          .select(`
            checkin_date,
            created_at
          `)
          .order(
            "created_at",
            {
              ascending: false
            }
          )
          .limit(
            1
          )

      ]);


    const errors = [

      accountsResult.error,
      settingsResult.error,
      billsResult.error,
      incomeResult.error,
      incomeSourcesResult.error,
      transfersResult.error,
      checkinResult.error

    ].filter(Boolean);


    if (
      errors.length > 0
    ) {

      console.error(
        "Today dashboard:",
        errors[0]
      );

      return;

    }


    const accounts =
      accountsResult.data || [];


    const settings =
      settingsResult.data;


    const bills =
      billsResult.data || [];


    const income =
      incomeResult.data || [];


    const incomeSources =
      incomeSourcesResult.data || [];


    const transfers =
      transfersResult.data || [];


    // ===================================================
    // ACCOUNTS
    // ===================================================

    const billsAccount =
      accounts.find(
        item =>
          item.account_name ===
          "Bills Account"
      );


    const spendingAccount =
      accounts.find(
        item =>
          item.account_name ===
          "Spending Account"
      );


    if (
      !billsAccount ||
      !spendingAccount
    ) {

      return;

    }


    const billsBalance =
      Number(
        billsAccount.current_balance || 0
      );


    const spendingBalance =
      Number(
        spendingAccount.current_balance || 0
      );


    const protectedFloor =
      Number(
        settings
          ?.bills_account_floor
        ??
        billsAccount.protected_floor
        ??
        0
      );


    const weeklyTarget =
      Number(
        settings
          ?.weekly_spending_target
        ??
        500
      );


    // ===================================================
    // INCOME SOURCE MAP
    // ===================================================

    const sourceMap =
      {};


    incomeSources.forEach(
      source => {

        sourceMap[
          source.id
        ] =
          source.source_name;

      }
    );


    // ===================================================
    // BUILD CONSERVATIVE 60-DAY EVENTS
    // ===================================================

    const events =
      [];


    bills.forEach(
      bill => {

        const occurrences =
          buildBillOccurrences(
            bill,
            today,
            sixtyDays
          );


        occurrences.forEach(
          occurrence => {

            events.push({

              date:
                occurrence.date,

              type:
                "Bill",

              description:
                occurrence.name,

              amount:
                -Number(
                  occurrence.amount
                )

            });

          }
        );

      }
    );


    income
      .filter(
        item =>
          !item.received &&
          item.expected_date >= today
      )
      .forEach(
        item => {

          events.push({

            date:
              item.expected_date,

            type:
              "Income",

            description:
              sourceMap[
                item.income_source_id
              ]
              ||
              "Income",

            amount:
              Number(
                item.actual_amount
                ??
                item.expected_amount
                ??
                0
              )

          });

        }
      );


    transfers
      .filter(
        item =>
          item.status === "planned"
      )
      .forEach(
        transfer => {

          events.push({

            date:
              transfer.transfer_date,

            type:
              "Transfer",

            description:
              "Spending Transfer",

            amount:
              -Number(
                transfer.amount || 0
              )

          });

        }
      );


    const priority = {

      "Income": 1,
      "Transfer": 2,
      "Bill": 3

    };


    events.sort(
      (a, b) => {

        if (
          a.date !== b.date
        ) {

          return a.date.localeCompare(
            b.date
          );

        }


        return (
          priority[a.type] || 99
        )
        -
        (
          priority[b.type] || 99
        );

      }
    );


    // ===================================================
    // FORECAST LOW
    // ===================================================

    let running =
      billsBalance;


    let low =
      billsBalance;


    let lowDate =
      today;


    events.forEach(
      event => {

        running +=
          event.amount;


        if (
          running < low
        ) {

          low =
            running;


          lowDate =
            event.date;

        }

      }
    );


    // ===================================================
    // RECOMMENDED WEEKLY TRANSFER
    // ===================================================

    const safeAboveFloor =
      Math.max(
        0,
        low - protectedFloor
      );


    const neededForTarget =
      Math.max(
        0,
        weeklyTarget - spendingBalance
      );


    const recommendedTransfer =
      Math.min(
        safeAboveFloor,
        neededForTarget
      );


    // ===================================================
    // NEXT INCOME
    // ===================================================

    const nextIncome =
      income.find(
        item =>
          !item.received &&
          item.expected_date >= today
      );


    // ===================================================
    // BILLS NEXT 7 DAYS
    // ===================================================

    const billsSevenDays =
      [];


    bills.forEach(
      bill => {

        const occurrences =
          buildBillOccurrences(
            bill,
            today,
            sevenDays
          );


        occurrences.forEach(
          occurrence => {

            billsSevenDays.push(
              occurrence
            );

          }
        );

      }
    );


    const billsSevenDaysTotal =
      billsSevenDays.reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.amount || 0
          ),
        0
      );


    // ===================================================
    // OVERDUE ATTENTION
    // ===================================================

    const overdueBills =
      bills.filter(
        bill =>
          bill.next_due_date &&
          bill.next_due_date < today
      );


    const overdueIncome =
      income.filter(
        item =>
          !item.received &&
          item.expected_date < today
      );


    const attentionCount =
      overdueBills.length +
      overdueIncome.length;


    // ===================================================
    // LAST CHECK-IN
    // ===================================================

    const lastCheckin =
      checkinResult.data
      &&
      checkinResult.data.length > 0
        ? checkinResult.data[0]
        : null;


    // ===================================================
    // DISPLAY
    // ===================================================

    document.getElementById(
      "todaySpendingBalance"
    ).textContent =
      money(
        spendingBalance
      );


    document.getElementById(
      "todayBillsBalance"
    ).textContent =
      money(
        billsBalance
      );


    document.getElementById(
      "todayBillsBalanceNote"
    ).textContent =
      `Preferred buffer: ${money(protectedFloor)}`;


    document.getElementById(
      "todayForecastLow"
    ).textContent =
      money(
        low
      );


    document.getElementById(
      "todayForecastLowDate"
    ).textContent =
      `Lowest point: ${prettyDate(lowDate)}`;


    document.getElementById(
      "todayRecommendedTransfer"
    ).textContent =
      money(
        recommendedTransfer
      );


    // ===================================================
    // LOW POINT CARD COLOUR
    // ===================================================

    const lowCard =
      document.getElementById(
        "todayLowCard"
      );


    if (
      low <= 0
    ) {

      lowCard.className =
        "today-card today-danger";

    }

    else if (
      low < protectedFloor
    ) {

      lowCard.className =
        "today-card today-tight";

    }

    else {

      lowCard.className =
        "today-card today-good";

    }


    // ===================================================
    // NEXT INCOME DISPLAY
    // ===================================================

    if (
      nextIncome
    ) {

      document.getElementById(
        "todayNextIncome"
      ).textContent =
        money(
          nextIncome.actual_amount
          ??
          nextIncome.expected_amount
        );


      document.getElementById(
        "todayNextIncomeNote"
      ).textContent =
        `${sourceMap[nextIncome.income_source_id] || "Income"} — ${prettyDate(nextIncome.expected_date)}`;

    }

    else {

      document.getElementById(
        "todayNextIncome"
      ).textContent =
        "—";


      document.getElementById(
        "todayNextIncomeNote"
      ).textContent =
        "No scheduled income found.";

    }


    // ===================================================
    // 7-DAY BILLS DISPLAY
    // ===================================================

    document.getElementById(
      "todayBillsSevenDays"
    ).textContent =
      money(
        billsSevenDaysTotal
      );


    document.getElementById(
      "todayBillsSevenDaysNote"
    ).textContent =
      `${billsSevenDays.length} payment${billsSevenDays.length === 1 ? "" : "s"} scheduled.`;


    // ===================================================
    // ATTENTION DISPLAY
    // ===================================================

    document.getElementById(
      "todayAttentionCount"
    ).textContent =
      attentionCount;


    const attentionCard =
      document.getElementById(
        "todayAttentionCard"
      );


    if (
      attentionCount > 0
    ) {

      attentionCard.className =
        "today-card today-danger";


      document.getElementById(
        "todayAttentionNote"
      ).textContent =
        `${overdueBills.length} overdue bill(s), ${overdueIncome.length} overdue income item(s).`;

    }

    else {

      attentionCard.className =
        "today-card today-good";


      document.getElementById(
        "todayAttentionNote"
      ).textContent =
        "Nothing overdue.";

    }


    // ===================================================
    // LAST CHECK-IN DISPLAY
    // ===================================================

    if (
      lastCheckin
    ) {

      document.getElementById(
        "todayLastCheckin"
      ).textContent =
        prettyDate(
          lastCheckin.checkin_date
        );


      document.getElementById(
        "todayLastCheckinNote"
      ).textContent =
        "Balances were confirmed on this date.";

    }


    // ===================================================
    // RECOMMENDATION
    // ===================================================

    const actionBox =
      document.getElementById(
        "todayActionBox"
      );


    const actionTitle =
      document.getElementById(
        "todayActionTitle"
      );


    const actionText =
      document.getElementById(
        "todayActionText"
      );


    const transferNote =
      document.getElementById(
        "todayTransferNote"
      );


    if (
      spendingBalance >= weeklyTarget
    ) {

      actionBox.className =
        "today-action-box today-good";


      actionTitle.textContent =
        "No transfer needed today";


      actionText.textContent =
        `The Spending Account already contains ${money(spendingBalance)}, which meets or exceeds the ${money(weeklyTarget)} weekly target.`;


      transferNote.textContent =
        "Weekly spending target is already funded.";

    }


    else if (
      recommendedTransfer >=
      neededForTarget &&
      neededForTarget > 0
    ) {

      actionBox.className =
        "today-action-box today-good";


      actionTitle.textContent =
        `Transfer ${money(recommendedTransfer)} to Spending`;


      actionText.textContent =
        `This brings Spending to the ${money(weeklyTarget)} weekly target while keeping the Bills Account above the preferred ${money(protectedFloor)} buffer.`;


      transferNote.textContent =
        "Full weekly top-up is currently safe.";

    }


    else if (
      recommendedTransfer > 0
    ) {

      actionBox.className =
        "today-action-box today-tight";


      actionTitle.textContent =
        `Limit today's transfer to ${money(recommendedTransfer)}`;


      actionText.textContent =
        `Spending needs ${money(neededForTarget)} to reach the weekly target, but the forecast supports only ${money(recommendedTransfer)} while preserving the preferred Bills buffer.`;


      transferNote.textContent =
        "Partial top-up only.";

    }


    else if (
      low > 0
    ) {

      actionBox.className =
        "today-action-box today-tight";


      actionTitle.textContent =
        "Hold the spending transfer for now";


      let message =
        `The Spending Account needs ${money(neededForTarget)} to reach the weekly target, but the Bills Account is projected to fall to ${money(low)} on ${prettyDate(lowDate)}.`;


      if (
        nextIncome
      ) {

        message +=
          ` The next scheduled income is ${sourceMap[nextIncome.income_source_id] || "income"} of ${money(nextIncome.expected_amount)} on ${prettyDate(nextIncome.expected_date)}.`;

      }


      actionText.textContent =
        message;


      transferNote.textContent =
        "Wait for cash flow to improve.";

    }


    else {

      actionBox.className =
        "today-action-box today-danger";


      actionTitle.textContent =
        "Do not transfer from Bills";


      actionText.textContent =
        `The forecast currently falls to ${money(low)} on ${prettyDate(lowDate)}. Review Check-In and Forecast before moving money to Spending.`;


      transferNote.textContent =
        "Forecast reaches zero or below.";

    }

  }


  // =====================================================
  // START
  // =====================================================

  async function startTodayDashboard() {

    const {
      data: { session }
    } =
      await dashboardSupabase
        .auth
        .getSession();


    if (!session) {
      return;
    }


    await loadTodayDashboard();

  }


  startTodayDashboard();

})();
