(() => {

  // =====================================================
  // SUPABASE
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
  // MONEY
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
  // DATE HELPERS
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
      date.getDate() +
      days
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
        value +
        "T00:00:00"
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
        dateString +
        "T00:00:00"
      );


    date.setDate(
      date.getDate() +
      days
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
        dateString +
        "T00:00:00"
      );


    date.setMonth(
      date.getMonth() +
      months
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

    const results =
      [];


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
        frequency ===
        "weekly"
      ) {

        current =
          addDays(
            current,
            7
          );

      }


      else if (
        frequency ===
        "biweekly"
      ) {

        current =
          addDays(
            current,
            14
          );

      }


      else if (
        frequency ===
        "semi-monthly"
      ) {

        current =
          addDays(
            current,
            15
          );

      }


      else if (
        frequency ===
        "monthly"
      ) {

        current =
          addMonths(
            current,
            1,
            bill.due_day
          );

      }


      else if (
        frequency ===
        "quarterly"
      ) {

        current =
          addMonths(
            current,
            3,
            bill.due_day
          );

      }


      else if (
        frequency ===
        "annual"
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
  // MAIN DASHBOARD LOAD
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


        // ACCOUNTS

        dashboardSupabase
          .from(
            "accounts"
          )
          .select(`
            id,
            account_name,
            current_balance,
            protected_floor,
            active
          `)
          .eq(
            "active",
            true
          ),


        // SETTINGS

        dashboardSupabase
          .from(
            "finance_settings"
          )
          .select(`
            bills_account_floor,
            weekly_spending_target
          `)
          .single(),


        // BILLS

        dashboardSupabase
          .from(
            "bills"
          )
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


        // INCOME OCCURRENCES

        dashboardSupabase
          .from(
            "income_occurrences"
          )
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
              ascending:
                true
            }
          ),


        // INCOME SOURCE NAMES

        dashboardSupabase
          .from(
            "income_sources"
          )
          .select(`
            id,
            source_name
          `),


        // PLANNED ACCOUNT TRANSFERS

        dashboardSupabase
          .from(
            "account_transfers"
          )
          .select(`
            id,
            transfer_date,
            from_account_id,
            to_account_id,
            amount,
            status,
            notes
          `)
          .eq(
            "status",
            "planned"
          )
          .gte(
            "transfer_date",
            today
          )
          .lte(
            "transfer_date",
            sixtyDays
          ),


        // LAST CHECK-IN

        dashboardSupabase
          .from(
            "account_checkins"
          )
          .select(`
            checkin_date,
            created_at
          `)
          .order(
            "created_at",
            {
              ascending:
                false
            }
          )
          .limit(
            1
          )

      ]);



    // ===================================================
    // ERRORS
    // ===================================================

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



    // ===================================================
    // DATA
    // ===================================================

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
    // FIND KEY ACCOUNTS
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

      console.error(
        "Bills Account or Spending Account not found."
      );


      return;

    }



    // ===================================================
    // ACCOUNT MAP
    // ===================================================

    const accountMap =
      {};


    accounts.forEach(
      account => {

        accountMap[
          account.id
        ] =
          account.account_name;

      }
    );



    // ===================================================
    // BALANCES / SETTINGS
    // ===================================================

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
    // BUILD VISIBLE + CONSERVATIVE EVENTS
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
                ),

              conservativeAmount:
                -Number(
                  occurrence.amount
                )

            });

          }
        );

      }
    );



    // ===================================================
    // NORMAL INCOME
    // ===================================================

    income
      .filter(
        item =>
          !item.received &&
          item.expected_date >= today
      )
      .forEach(
        item => {

          const amount =
            Number(
              item.actual_amount
              ??
              item.expected_amount
              ??
              0
            );


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
              amount,

            conservativeAmount:
              amount

          });

        }
      );



    // ===================================================
    // GENERIC PLANNED TRANSFERS
    // ===================================================

    transfers.forEach(
      transfer => {

        const amount =
          Number(
            transfer.amount || 0
          );


        // -----------------------------------------------
        // MONEY LEAVING BILLS
        // -----------------------------------------------

        if (
          transfer.from_account_id ===
          billsAccount.id
        ) {

          const destination =
            accountMap[
              transfer.to_account_id
            ]
            ||
            "another account";


          events.push({

            date:
              transfer.transfer_date,

            type:
              "Transfer Out",

            description:
              `To ${destination}`,

            amount:
              -amount,

            conservativeAmount:
              -amount

          });

        }


        // -----------------------------------------------
        // MONEY COMING INTO BILLS
        // -----------------------------------------------

        else if (
          transfer.to_account_id ===
          billsAccount.id
        ) {

          const source =
            accountMap[
              transfer.from_account_id
            ]
            ||
            "another account";


          events.push({

            date:
              transfer.transfer_date,

            type:
              "Transfer In",

            description:
              `From ${source}`,

            amount:
              amount,

            // Conservative guidance does not depend
            // on planned incoming transfers.
            conservativeAmount:
              0

          });

        }


        // Transfers not involving Bills are ignored.

      }
    );



    // ===================================================
    // SORT EVENTS
    // ===================================================

    const priority = {

      "Income":
        1,

      "Transfer In":
        2,

      "Transfer Out":
        3,

      "Bill":
        4

    };


    events.sort(
      (a, b) => {

        if (
          a.date !==
          b.date
        ) {

          return a.date.localeCompare(
            b.date
          );

        }


        return (
          priority[
            a.type
          ]
          ||
          99
        )
        -
        (
          priority[
            b.type
          ]
          ||
          99
        );

      }
    );



    // ===================================================
    // VISIBLE + CONSERVATIVE FORECAST
    // ===================================================

    let visibleRunning =
      billsBalance;


    let visibleLow =
      billsBalance;


    let visibleLowDate =
      today;


    let conservativeRunning =
      billsBalance;


    let conservativeLow =
      billsBalance;


    let conservativeLowDate =
      today;


    events.forEach(
      event => {

        visibleRunning +=
          event.amount;


        conservativeRunning +=
          Number(
            event.conservativeAmount
            ??
            event.amount
          );


        if (
          visibleRunning <
          visibleLow
        ) {

          visibleLow =
            visibleRunning;


          visibleLowDate =
            event.date;

        }


        if (
          conservativeRunning <
          conservativeLow
        ) {

          conservativeLow =
            conservativeRunning;


          conservativeLowDate =
            event.date;

        }

      }
    );



    // ===================================================
    // AVAILABLE FUNDS TO TRANSFER
    // ===================================================

    /*
      Available Funds to Transfer means:

      The maximum amount that could leave the Bills Account
      today while the CONSERVATIVE 60-day forecast still
      remains at or above the Protected Bills Balance.

      The weekly spending target does NOT cap this amount.

      Planned transfers INTO Bills are not relied upon
      until they are actually completed.
    */

    const availableFundsToTransfer =
      Math.max(
        0,
        conservativeLow -
        protectedFloor
      );


    const protectedShortfall =
      Math.max(
        0,
        protectedFloor -
        conservativeLow
      );



    // ===================================================
    // NEXT SCHEDULED INCOME
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
          bill.next_due_date <
          today
      );


    const overdueIncome =
      income.filter(
        item =>
          !item.received &&
          item.expected_date <
          today
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
    // DISPLAY ACCOUNT VALUES
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
      `Protected Bills Balance: ${money(protectedFloor)} above $0. Overdraft excluded.`;



    // ===================================================
    // DISPLAY FORECAST LOW
    // ===================================================

    document.getElementById(
      "todayForecastLow"
    ).textContent =
      money(
        conservativeLow
      );


    document.getElementById(
      "todayForecastLowDate"
    ).textContent =
      `Lowest point: ${prettyDate(conservativeLowDate)}`;



    // ===================================================
    // DISPLAY AVAILABLE FUNDS TO TRANSFER
    // ===================================================

    document.getElementById(
      "todayRecommendedTransfer"
    ).textContent =
      money(
        availableFundsToTransfer
      );



    // ===================================================
    // LOW CARD COLOUR
    // ===================================================

    const lowCard =
      document.getElementById(
        "todayLowCard"
      );


    if (
      conservativeLow <= 0
    ) {

      lowCard.className =
        "today-card today-danger";

    }


    else if (
      conservativeLow <
      protectedFloor
    ) {

      lowCard.className =
        "today-card today-tight";

    }


    else {

      lowCard.className =
        "today-card today-good";

    }



    // ===================================================
    // NEXT INCOME
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
        `${
          sourceMap[
            nextIncome.income_source_id
          ]
          ||
          "Income"
        } — ${prettyDate(nextIncome.expected_date)}`;

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
    // BILLS NEXT 7 DAYS
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
      `${billsSevenDays.length} payment${
        billsSevenDays.length === 1
          ? ""
          : "s"
      } scheduled.`;



    // ===================================================
    // ATTENTION
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
    // LAST CHECK-IN
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


    else {

      document.getElementById(
        "todayLastCheckin"
      ).textContent =
        "—";


      document.getElementById(
        "todayLastCheckinNote"
      ).textContent =
        "No check-in recorded yet.";

    }



    // ===================================================
    // AVAILABLE FUNDS / FINANCIAL POSITION MESSAGE
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


    const transferCard =
      document.getElementById(
        "todayTransferCard"
      );



    // ===================================================
    // SAFE MONEY IS AVAILABLE
    // ===================================================

    if (
      availableFundsToTransfer > 0
    ) {

      actionBox.className =
        "today-action-box today-good";


      transferCard.className =
        "today-card today-primary today-good";


      actionTitle.textContent =
        `${money(availableFundsToTransfer)} is available to transfer`;


      actionText.textContent =
        `Based on the conservative 60-day forecast, up to ${money(
          availableFundsToTransfer
        )} could leave the Bills Account today while still keeping the forecast at or above the ${money(
          protectedFloor
        )} Protected Bills Balance. You may transfer all of it, some of it, or none of it. Money left in Bills remains available for future protection.`;


      transferNote.textContent =
        `Safe maximum based on the forecast. The ${money(
          weeklyTarget
        )} weekly spending target does not limit this amount.`;

    }



    // ===================================================
    // BELOW PROTECTED BALANCE BUT STILL ABOVE ZERO
    // ===================================================

    else if (
      conservativeLow > 0
    ) {

      actionBox.className =
        "today-action-box today-tight";


      transferCard.className =
        "today-card today-primary today-tight";


      actionTitle.textContent =
        "No funds are currently available to transfer";


      let message =
        `Keep funds in the Bills Account for now. The conservative forecast is projected to fall to ${money(
          conservativeLow
        )} on ${prettyDate(
          conservativeLowDate
        )}. This is ${money(
          protectedShortfall
        )} below the ${money(
          protectedFloor
        )} Protected Bills Balance.`;


      if (
        nextIncome
      ) {

        message +=
          ` The next scheduled income is ${
            sourceMap[
              nextIncome.income_source_id
            ]
            ||
            "income"
          } of ${money(
            nextIncome.actual_amount
            ??
            nextIncome.expected_amount
          )} on ${prettyDate(
            nextIncome.expected_date
          )}. Once additional cash is actually in the Bills Account, the available amount may increase if the forecast requirements are met.`;

      }


      actionText.textContent =
        message;


      transferNote.textContent =
        "Keep funds in Bills. The Protected Bills Balance is not currently maintained throughout the forecast.";

    }



    // ===================================================
    // FORECAST REACHES ZERO OR BELOW
    // ===================================================

    else {

      actionBox.className =
        "today-action-box today-danger";


      transferCard.className =
        "today-card today-primary today-danger";


      actionTitle.textContent =
        "Do not transfer money from Bills";


      let message =
        `The conservative Bills forecast is projected to reach ${money(
          conservativeLow
        )} on ${prettyDate(
          conservativeLowDate
        )}. This is ${money(
          protectedShortfall
        )} below the ${money(
          protectedFloor
        )} Protected Bills Balance. The overdraft is not treated as available money.`;


      if (
        nextIncome
      ) {

        message +=
          ` The next scheduled income is ${
            sourceMap[
              nextIncome.income_source_id
            ]
            ||
            "income"
          } of ${money(
            nextIncome.actual_amount
            ??
            nextIncome.expected_amount
          )} on ${prettyDate(
            nextIncome.expected_date
          )}.`;

      }


      message +=
        " Review the Forecast before moving money out of Bills.";


      actionText.textContent =
        message;


      transferNote.textContent =
        "No funds available. Forecast reaches $0 or below.";

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
