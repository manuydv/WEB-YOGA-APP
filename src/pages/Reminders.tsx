import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { currentMonth, daysSince, dueDateForMonth, formatDate } from "@/lib/dates";
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

export default function Reminders() {
  const { studio } = useAuth();
  const reminderDays = studio?.reminder_days ?? 5;

  const [members, setMembers] = useState<Member[]>([]);
  const [paidMemberIds, setPaidMemberIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [membersRes, paymentsRes] = await Promise.all([
      supabase.from("members").select("*").order("name", { ascending: true }),
      supabase.from("payments").select("member_id").eq("month", currentMonth()).eq("paid", true),
    ]);
    setMembers(membersRes.data ?? []);
    setPaidMemberIds(new Set((paymentsRes.data ?? []).map((p) => p.member_id)));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const overdue = useMemo(() => {
    const month = currentMonth();
    return members
      .filter((m) => !paidMemberIds.has(m.id))
      .map((m) => {
        const dueDate = dueDateForMonth(m.joined_on, month);
        return { member: m, dueDate, overdueDays: daysSince(dueDate) };
      })
      .filter((x) => x.overdueDays >= reminderDays)
      .sort((a, b) => b.overdueDays - a.overdueDays);
  }, [members, paidMemberIds, reminderDays]);

  const withoutPhone = overdue.filter((x) => !x.member.phone).length;

  if (loading) return <LoadingScreen />;

  return (
    <div>
      <TopBar title="Payment reminders" back />
      <div className="p-4 pb-10">
        <p className="mb-4 text-sm text-text-muted">
          {overdue.length} member{overdue.length === 1 ? "" : "s"} unpaid and {reminderDays}+ days overdue.
          {withoutPhone > 0 ? ` ${withoutPhone} have no phone number on file.` : ""}
        </p>

        {overdue.length === 0 ? (
          <p className="mt-10 text-center text-sm text-text-muted">Nobody's overdue right now.</p>
        ) : (
          overdue.map(({ member, dueDate, overdueDays }) => {
            const message = `Hi ${member.name}, this is a reminder from ${studio?.name ?? "the studio"} that your membership fee of ${formatMoney(
              member.monthly_fee
            )} was due on ${formatDate(dueDate)}. Please make the payment at your earliest convenience. Thank you!`;
            return (
              <Card key={member.id} className="mb-3">
                <div className="flex items-center gap-3">
                  <Avatar url={member.photo_url} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-semibold text-text">{member.name}</div>
                    <div className="mt-0.5 text-xs text-text-muted">
                      Due {formatDate(dueDate)} · {overdueDays} days overdue · {formatMoney(member.monthly_fee)}
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
