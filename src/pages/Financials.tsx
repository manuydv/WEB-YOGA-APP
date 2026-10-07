import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { currentMonth, recentMonths } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { Card } from "@/components/ui";
import TopBar from "@/components/TopBar";
import type { Employee, Expense, Payment, Visit } from "@/types/database";

const LOOKBACK_MONTHS = 6;

export default function Financials() {
  const { staffUser, studio } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!staffUser) return;
    setError(null);
    const months = recentMonths(LOOKBACK_MONTHS);
    const sinceDate = new Date();
    sinceDate.setMonth(sinceDate.getMonth() - LOOKBACK_MONTHS);
    const since = sinceDate.toISOString().slice(0, 10);

    const [paymentsRes, visitsRes, expensesRes, employeesRes] = await Promise.all([
      supabase.from("payments").select("*").eq("paid", true).in("month", months),
      supabase.from("visits").select("*").gte("visited_on", since).not("amount", "is", null),
      supabase
        .from("expenses")
        .select("*")
        .gte("expense_date", since)
        .order("expense_date", { ascending: false }),
      supabase.from("employees").select("*").eq("status", "active"),
    ]);

    if (paymentsRes.error) setError(paymentsRes.error.message);
    setPayments(paymentsRes.data ?? []);
    setVisits(visitsRes.data ?? []);
    setExpenses(expensesRes.data ?? []);
    setEmployees(employeesRes.data ?? []);
  }, [staffUser]);

  useEffect(() => {
    load();
  }, [load]);

  const thisMonth = currentMonth();
  const monthlyPayroll = employees.reduce((sum, e) => sum + e.monthly_pay, 0);

  const thisMonthIncome =
    payments.filter((p) => p.month === thisMonth).reduce((sum, p) => sum + (p.amount ?? 0), 0) +
    visits.filter((v) => v.visited_on.startsWith(thisMonth)).reduce((sum, v) => sum + (v.amount ?? 0), 0);

  const thisMonthExpenses = expenses
    .filter((e) => e.expense_date.startsWith(thisMonth))
    .reduce((sum, e) => sum + e.amount, 0);

  const net = thisMonthIncome - thisMonthExpenses - monthlyPayroll;

  return (
    <div>
      <TopBar title="Financials" />
      <div className="p-4 pb-10">
        <div className="mb-2.5 flex gap-2.5">
          <Card className="flex-1">
            <div className="text-xs text-text-muted">Income</div>
            <div className="mt-1 text-lg font-bold text-success">{formatMoney(thisMonthIncome, studio?.currency)}</div>
          </Card>
          <Card className="flex-1">
            <div className="text-xs text-text-muted">Expenses</div>
            <div className="mt-1 text-lg font-bold text-danger">
              {formatMoney(thisMonthExpenses + monthlyPayroll, studio?.currency)}
            </div>
          </Card>
        </div>

        <Card className="mb-5">
          <div className="text-xs text-text-muted">Net this month</div>
          <div className={`mt-1 text-[26px] font-bold ${net >= 0 ? "text-success" : "text-danger"}`}>
            {formatMoney(net, studio?.currency)}
          </div>
          <div className="mt-2 text-xs text-text-muted">
            Includes {formatMoney(monthlyPayroll, studio?.currency)} payroll for {employees.length} active{" "}
            {employees.length === 1 ? "employee" : "employees"}.
          </div>
        </Card>

        {error ? <p className="mb-3 text-center text-sm text-danger">{error}</p> : null}
      </div>
    </div>
  );
}
