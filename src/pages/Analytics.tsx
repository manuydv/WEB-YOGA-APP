import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { getBusinessTypeConfig } from "@/lib/businessTypes";
import { currentMonth, formatMonth } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { Card, SectionLabel } from "@/components/ui";
import { ChartLegend, DonutChart } from "@/components/DonutChart";
import TopBar from "@/components/TopBar";
import LoadingScreen from "@/components/LoadingScreen";
import type { Expense, ExpenseCategory, Gender, Member } from "@/types/database";

// Fixed categorical order, validated for colorblind-safe adjacency
// (see the dataviz skill) — each identity always gets the same hue.
const CATEGORY_COLORS = {
  gender: {
    female: "#2a78d6",
    male: "#eb6834",
    other: "#1baf7a",
    unset: "#b9b8b2",
  } as Record<Gender | "unset", string>,
  expense: {
    rent: "#2a78d6",
    cleaning: "#eb6834",
    utilities: "#1baf7a",
    supplies: "#eda100",
    payroll: "#e87ba4",
    other: "#008300",
  } as Record<ExpenseCategory, string>,
};

const EXPENSE_CATEGORY_ORDER: ExpenseCategory[] = ["rent", "cleaning", "utilities", "supplies", "payroll", "other"];

export default function Analytics() {
  const { staffUser, studio } = useAuth();
  const config = getBusinessTypeConfig(studio?.business_type ?? "yoga_studio");

  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [paidMemberIds, setPaidMemberIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!staffUser) return;
    const month = currentMonth();
    const [membersRes, expensesRes, paymentsRes] = await Promise.all([
      supabase.from("members").select("*"),
      supabase.from("expenses").select("*").gte("expense_date", `${month}-01`),
      config.mode === "membership"
        ? supabase.from("payments").select("member_id").eq("month", month).eq("paid", true)
        : Promise.resolve({ data: [] as { member_id: string }[] }),
    ]);
    setMembers(membersRes.data ?? []);
    setExpenses(expensesRes.data ?? []);
    setPaidMemberIds(new Set((paymentsRes.data ?? []).map((p) => p.member_id)));
    setLoading(false);
  }, [staffUser, config.mode]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingScreen />;

  const activeMembers = config.mode === "membership" ? members.filter((m) => m.status === "active") : members;
  const genderCounts: Record<Gender | "unset", number> = { female: 0, male: 0, other: 0, unset: 0 };
  for (const m of activeMembers) {
    genderCounts[m.gender ?? "unset"]++;
  }
  const genderSegments = (["female", "male", "other", "unset"] as const)
    .map((key) => ({
      label: key === "unset" ? "Not set" : key[0].toUpperCase() + key.slice(1),
      value: genderCounts[key],
      color: CATEGORY_COLORS.gender[key],
    }))
    .filter((s) => s.value > 0);

  const expenseTotals: Record<ExpenseCategory, number> = {
    rent: 0,
    cleaning: 0,
    utilities: 0,
    supplies: 0,
    payroll: 0,
    other: 0,
  };
  const thisMonth = currentMonth();
  for (const e of expenses) {
    if (!e.expense_date.startsWith(thisMonth)) continue;
    expenseTotals[e.category] += e.amount;
  }
  const expenseSegments = EXPENSE_CATEGORY_ORDER.map((cat) => ({
    label: cat[0].toUpperCase() + cat.slice(1),
    value: expenseTotals[cat],
    color: CATEGORY_COLORS.expense[cat],
  })).filter((s) => s.value > 0);
  const totalExpenses = expenseSegments.reduce((sum, s) => sum + s.value, 0);

  const unpaidActive =
    config.mode === "membership"
      ? activeMembers.filter((m) => !paidMemberIds.has(m.id)).sort((a, b) => a.name.localeCompare(b.name))
      : [];
  const inactiveMembers =
    config.mode === "membership"
      ? members.filter((m) => m.status === "inactive").sort((a, b) => a.name.localeCompare(b.name))
      : [];

  return (
    <div>
      <TopBar title="Analytics" />
      <div className="p-4 pb-10">
        <SectionLabel>
          {config.mode === "membership" ? "Active " : ""}
          {config.personLabelPlural.toLowerCase()} by gender
        </SectionLabel>
        <Card className="mb-5">
          {genderSegments.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-muted">No {config.personLabelPlural.toLowerCase()} yet.</p>
          ) : (
            <div className="flex items-center gap-5">
              <DonutChart segments={genderSegments} centerLabel={String(activeMembers.length)} />
              <ChartLegend segments={genderSegments} />
            </div>
          )}
        </Card>

        <SectionLabel>Expenses this month · {formatMonth(currentMonth())}</SectionLabel>
        <Card className="mb-5">
          {expenseSegments.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-muted">No expenses logged this month.</p>
          ) : (
            <div className="flex items-center gap-5">
              <DonutChart segments={expenseSegments} centerLabel={formatMoney(totalExpenses, studio?.currency)} />
              <ChartLegend segments={expenseSegments} format={(v) => formatMoney(v, studio?.currency)} />
            </div>
          )}
        </Card>

        {config.mode === "membership" ? (
          <>
            <SectionLabel>Active, unpaid this month ({unpaidActive.length})</SectionLabel>
            <Card className="mb-5 divide-y divide-border p-0">
              {unpaidActive.length === 0 ? (
                <p className="p-4 text-center text-sm text-text-muted">Everyone active has paid this month.</p>
              ) : (
                unpaidActive.map((m) => (
                  <Link key={m.id} to={`/clients/${m.id}`} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <div className="text-sm font-semibold text-text">{m.name}</div>
                      <div className="mt-0.5 text-xs text-text-muted">{m.phone ?? "No phone on file"}</div>
                    </div>
                    <div className="text-sm font-semibold text-danger">{formatMoney(m.monthly_fee, studio?.currency)}</div>
                  </Link>
                ))
              )}
            </Card>

            <SectionLabel>Became inactive — reach out ({inactiveMembers.length})</SectionLabel>
            <Card className="divide-y divide-border p-0">
              {inactiveMembers.length === 0 ? (
                <p className="p-4 text-center text-sm text-text-muted">No inactive members right now.</p>
              ) : (
                inactiveMembers.map((m) => (
                  <Link key={m.id} to={`/clients/${m.id}`} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <div className="text-sm font-semibold text-text">{m.name}</div>
                      <div className="mt-0.5 text-xs text-text-muted">{m.phone ?? "No phone on file"}</div>
                    </div>
                  </Link>
                ))
              )}
            </Card>
          </>
        ) : null}
      </div>
    </div>
  );
}
