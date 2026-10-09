import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { currentMonth, daysSince, dueDateForMonth, formatDate, monthRange } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { waLink } from "@/lib/whatsapp";
import { Card } from "@/components/ui";
import TopBar from "@/components/TopBar";
import LoadingScreen from "@/components/LoadingScreen";
import type { Member } from "@/types/database";

function Avatar({ url }: { url: string | null }) {
  return (
    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-surface-raised">
      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : null}
    </div>
  );
}

interface OverdueMember {
  member: Member;
  oldestUnpaidMonth: string;
  dueDate: string;
  overdueDays: number;
  unpaidMonthCount: number;
  totalOwed: number;
}

export default function Reminders() {
  const { studio } = useAuth();
  const reminderDays = studio?.reminder_days ?? 5;

  const [members, setMembers] = useState<Member[]>([]);
  const [paidByMember, setPaidByMember] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [membersRes, paymentsRes] = await Promise.all([
      supabase.from("members").select("*").order("name", { ascending: true }),
      supabase.from("payments").select("member_id, month, paid").eq("paid", true),
    ]);
    setMembers(membersRes.data ?? []);
    const map: Record<string, Set<string>> = {};
    for (const p of paymentsRes.data ?? []) {
      (map[p.member_id] ??= new Set()).add(p.month);
    }
    setPaidByMember(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const overdue = useMemo(() => {
    const nowMonth = currentMonth();
    const result: OverdueMember[] = [];

    for (const member of members) {
      const joinMonth = member.joined_on.slice(0, 7);
      const owedMonths = monthRange(joinMonth, nowMonth);
      const paidMonths = paidByMember[member.id] ?? new Set<string>();
      const unpaidMonths = owedMonths.filter((m) => !paidMonths.has(m));
      if (unpaidMonths.length === 0) continue;

      const oldestUnpaidMonth = unpaidMonths[0];
      const dueDate = dueDateForMonth(member.joined_on, oldestUnpaidMonth);
      const overdueDays = daysSince(dueDate);
      if (overdueDays < reminderDays) continue;

      result.push({
        member,
        oldestUnpaidMonth,
        dueDate,
        overdueDays,
        unpaidMonthCount: unpaidMonths.length,
        totalOwed: member.monthly_fee * unpaidMonths.length,
      });
    }

    return result.sort((a, b) => b.overdueDays - a.overdueDays);
  }, [members, paidByMember, reminderDays]);

  const withoutPhone = overdue.filter((x) => !x.member.phone).length;

  if (loading) return <LoadingScreen />;

  return (
    <div>
      <TopBar title="Payment reminders" back />
      <div className="p-4 pb-10">
        <p className="mb-4 text-sm text-text-muted">
          {overdue.length} member{overdue.length === 1 ? "" : "s"} with a payment {reminderDays}+ days overdue.
          {withoutPhone > 0 ? ` ${withoutPhone} have no phone number on file.` : ""}
        </p>

        {overdue.length === 0 ? (
          <p className="mt-10 text-center text-sm text-text-muted">Nobody's overdue right now.</p>
        ) : (
          overdue.map(({ member, dueDate, overdueDays, unpaidMonthCount, totalOwed }) => {
            const message =
              unpaidMonthCount > 1
                ? `Hi ${member.name}, this is a reminder from ${studio?.name ?? "the studio"} that you have ${unpaidMonthCount} months of unpaid membership fees (${formatMoney(
                    totalOwed
                  )} total), the oldest due on ${formatDate(dueDate)}. Please make the payment at your earliest convenience. Thank you!`
                : `Hi ${member.name}, this is a reminder from ${studio?.name ?? "the studio"} that your membership fee of ${formatMoney(
                    member.monthly_fee
                  )} was due on ${formatDate(dueDate)}. Please make the payment at your earliest convenience. Thank you!`;
            return (
              <Card key={member.id} className="mb-3">
                <div className="flex items-center gap-3">
                  <Avatar url={member.photo_url} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-semibold text-text">{member.name}</div>
                    <div className="mt-0.5 text-xs text-text-muted">
                      {unpaidMonthCount > 1
                        ? `${unpaidMonthCount} months unpaid · ${formatMoney(totalOwed)} owed · oldest due ${formatDate(dueDate)} (${overdueDays}d ago)`
                        : `Due ${formatDate(dueDate)} · ${overdueDays} days overdue · ${formatMoney(member.monthly_fee)}`}
                    </div>
                  </div>
                </div>
                {member.phone ? (
                  <a
                    href={waLink(member.phone, message)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 block rounded-xl bg-accent py-2.5 text-center text-sm font-semibold text-white"
                  >
                    Message on WhatsApp
                  </a>
                ) : (
                  <p className="mt-3 text-center text-xs text-text-muted">No phone number on file.</p>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
