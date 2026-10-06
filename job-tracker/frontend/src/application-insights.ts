import { STATUSES, type Application, type ApplicationStatus } from "./api";

export type StatusSummary = {
  total: number;
  byStatus: Record<ApplicationStatus, { count: number; share: number }>;
};

export type ActivityDay = {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
};

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function formatLocalDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getRollingWindowStart(today: string): string {
  const endDate = parseLocalDate(today);
  const priorYear = endDate.getFullYear() - 1;
  const month = endDate.getMonth();
  const finalDayOfPriorMonth = new Date(priorYear, month + 1, 0).getDate();
  const day = Math.min(endDate.getDate(), finalDayOfPriorMonth);
  return formatLocalDate(new Date(priorYear, month, day, 12));
}

export function getActivityDays(applications: Application[], today: string): ActivityDay[] {
  const start = parseLocalDate(getRollingWindowStart(today));
  const end = parseLocalDate(today);
  const counts = new Map<string, number>();

  for (const application of applications) {
    if (application.date_applied >= formatLocalDate(start) && application.date_applied <= today) {
      counts.set(application.date_applied, (counts.get(application.date_applied) ?? 0) + 1);
    }
  }

  const days: ActivityDay[] = [];
  for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const key = formatLocalDate(date);
    const count = counts.get(key) ?? 0;
    const level = Math.min(count, 4) as ActivityDay["level"];
    days.push({ date: key, count, level });
  }

  return days;
}

export function summarizeStatuses(applications: Application[]): StatusSummary {
  const byStatus = Object.fromEntries(
    STATUSES.map((status) => [status, { count: 0, share: 0 }]),
  ) as StatusSummary["byStatus"];

  for (const application of applications) {
    byStatus[application.status].count += 1;
  }

  const total = applications.length;
  for (const status of STATUSES) {
    byStatus[status].share = total === 0 ? 0 : byStatus[status].count / total;
  }

  return { total, byStatus };
}