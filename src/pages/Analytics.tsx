import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { getBusinessTypeConfig } from "@/lib/businessTypes";
import { currentMonth, formatMonth, formatMonthShort, recentMonths } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { Card, SectionLabel } from "@/components/ui";
import { ChartLegend, DonutChart } from "@/components/DonutChart";
import { GroupedBarRows, LegendRow, RankedBarList } from "@/components/BarChart";
import TopBar from "@/components/TopBar";
import LoadingScreen from "@/components/LoadingScreen";
import type { Class, Expense, ExpenseCategory, Gender, Member } from "@/types/database";

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
const TREND_MONTHS = 6;

// Reused app-wide for "good"/"bad" pairs (Paid/Unpaid, Active/Inactive) —
// kept consistent here rather than introducing a new categorical pair.
const GOOD_COLOR = "#6b7a4a"; // --color-success
const BAD_COLOR = "#b23a2e"; // --color-danger

export default function Analytics() {
  const { staffUser, studio } = useAuth();
  const config = getBusinessTypeConfig(studio?.business_type ?? "yoga_studio");

  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [paidMemberIds, setPaidMemberIds] = useState<Set<string>>(new Set());
  const [revenueByMonth, setRevenueByMonth] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!staffUser) return;
    const month = currentMonth();
    const months = recentMonths(TREND_MONTHS).reverse();
    const oldestMonth = months[0];

    if (config.mode === "membership") {
      await supabase.rpc("sync_member_statuses");
    }

    const [membersRes, expensesRes, paymentsRes, visitsRes, classesRes] = await Promise.all([
      supabase.from("members").select("*"),
      supabase.from("expenses").select("*").gte("expense_date", `${oldestMonth}-01`),
      config.mode === "membership"
        ? supabase.from("payments").select("member_id, month, amount").in("month", months).eq("paid", true)
        : Promise.resolve({ data: [] as { member_id: string; month: string; amount: number | null }[] }),
      config.mode === "visit"
        ? supabase.from("visits").select("visited_on, amount").gte("visited_on", `${oldestMonth}-01`)
        : Promise.resolve({ data: [] as { visited_on: string; amount: number | null }[] }),
      config.mode === "membership"
        ? supabase.from("classes").select("*").order("start_time", { ascending: true })
        : Promise.resolve({ data: [] as Class[] }),
    ]);

    setMembers(membersRes.data ?? []);
    setExpenses(expensesRes.data ?? []);
    setClasses(classesRes.data ?? []);

    const revenue: Record<string, number> = {};
    for (const p of paymentsRes.data ?? []) {
      revenue[p.month] = (revenue[p.month] ?? 0) + (p.amount ?? 0);
    }
    for (const v of visitsRes.data ?? []) {
      const m = v.visited_on.slice(0, 7);
      revenue[m] = (revenue[m] ?? 0) + (v.amount ?? 0);
    }
    setRevenueByMonth(revenue);
    setPaidMemberIds(
      new Set((paymentsRes.data ?? []).filter((p) => p.month === month).map((p) => p.member_id))
    );
    setLoading(false);
  }, [staffUser, config.mode]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingScreen />;

  const months = recentMonths(TREND_MONTHS).reverse();
  const thisMonth = currentMonth();

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
  const expensesByMonth: Record<string, number> = {};
  for (const e of expenses) {
    const m = e.expense_date.slice(0, 7);
    expensesByMonth[m] = (expensesByMonth[m] ?? 0) + e.amount;
    if (m === thisMonth) expenseTotals[e.category] += e.amount;
  }
  const expenseSegments = EXPENSE_CATEGORY_ORDER.map((cat) => ({
    label: cat[0].toUpperCase() + cat.slice(1),
    value: expenseTotals[cat],
    color: CATEGORY_COLORS.expense[cat],
  })).filter((s) => s.value > 0);
  const totalExpensesThisMonth = expenseSegments.reduce((sum, s) => sum + s.value, 0);

  const unpaidActive =
    config.mode === "membership"
      ? activeMembers.filter((m) => !paidMemberIds.has(m.id)).sort((a, b) => a.name.localeCompare(b.name))
      : [];
  const inactiveMembers =
    config.mode === "membership"
      ? members.filter((m) => m.status === "inactive").sort((a, b) => a.name.localeCompare(b.name))
      : [];

  const revenueExpenseRows = months.map((m) => ({
    label: formatMonthShort(m),
    values: [revenueByMonth[m] ?? 0, expensesByMonth[m] ?? 0],
  }));

  const expectedRevenue = activeMembers.reduce((sum, m) => sum + m.monthly_fee, 0);
  const collectedThisMonth = revenueByMonth[thisMonth] ?? 0;
  const collectionPct = expectedRevenue > 0 ? Math.min(100, Math.round((collectedThisMonth / expectedRevenue) * 100)) : 0;

  const batchCounts: Record<string, number> = {};
  let noBatchCount = 0;
  for (const m of activeMembers) {
    if (m.class_id) batchCounts[m.class_id] = (batchCounts[m.class_id] ?? 0) + 1;
    else noBatchCount++;
  }
  const batchRows = classes
    .map((c) => ({ label: c.name, value: batchCounts[c.id] ?? 0 }))
    .sort((a, b) => b.value - a.value);
  if (noBatchCount > 0) batchRows.push({ label: "No batch assigned", value: noBatchCount });

  const joinsByMonth: Record<string, number> = {};
  for (const m of members) {
    const joinMonth = m.joined_on.slice(0, 7);
    if (months.includes(joinMonth)) joinsByMonth[joinMonth] = (joinsByMonth[joinMonth] ?? 0) + 1;
  }
  const joinRows = months.map((m) => ({ label: formatMonthShort(m), value: joinsByMonth[m] ?? 0 }));

  return (
    <div>
      <TopBar title="Analytics" />
      <div className="p-4 pb-10">
        <SectionLabel>
          Revenue vs. expenses · last {TREND_MONTHS} months
        </SectionLabel>
        <Card className="mb-5">
          <LegendRow
            items={[
              { label: "Collected", color: GOOD_COLOR },
              { label: "Expenses", color: BAD_COLOR },
            ]}
          />
          <GroupedBarRows
            rows={revenueExpenseRows}
            colors={[GOOD_COLOR, BAD_COLOR]}
            format={(v) => formatMoney(v, studio?.currency)}
          />
        </Card>

        {config.mode === "membership" ? (
          <>
            <SectionLabel>Collection rate · {formatMonth(thisMonth)}</SectionLabel>
            <Card className="mb-5">
              <div className="mb-2 flex items-baseline justify-between">
                <div className="text-2xl font-bold text-text">{collectionPct}%</div>
                <div className="text-xs font-semibold text-text-muted">
                  {formatMoney(collectedThisMonth, studio?.currency)} of {formatMoney(expectedRevenue, studio?.currency)}
                </div>
              </div>
              <div className="h-2.5 w-full rounded-full bg-surface-raised">
                <div
                  className="h-2.5 rounded-r-full"
                  style={{ width: `${Math.max(collectionPct, collectionPct > 0 ? 2 : 0)}%`, backgroundColor: GOOD_COLOR }}
                />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-text-muted">
                Based on {activeMembers.length} active member{activeMembers.length === 1 ? "" : "s"}' monthly fees.
              </p>
            </Card>
          </>
        ) : null}

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

        {config.mode === "membership" && batchRows.length > 0 ? (
          <>
            <SectionLabel>Batch popularity</SectionLabel>
            <Card className="mb-5">
              <RankedBarList rows={batchRows} color="#2a78d6" />
            </Card>
          </>
        ) : null}

        <SectionLabel>Expenses this month · {formatMonth(thisMonth)}</SectionLabel>
        <Card className="mb-5">
          {expenseSegments.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-muted">No expenses logged this month.</p>
          ) : (
            <div className="flex items-center gap-5">
              <DonutChart segments={expenseSegments} centerLabel={formatMoney(totalExpensesThisMonth, studio?.currency)} />
              <ChartLegend segments={expenseSegments} format={(v) => formatMoney(v, studio?.currency)} />
            </div>
          )}
        </Card>

        <SectionLabel>
          New {config.personLabelPlural.toLowerCase()} · last {TREND_MONTHS} months
        </SectionLabel>
        <Card className="mb-5">
          <RankedBarList rows={joinRows} color="#c1502d" />
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
