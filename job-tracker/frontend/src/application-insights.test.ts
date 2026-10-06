import { describe, expect, it } from "vitest";

import { STATUSES, type Application } from "./api";
import { getActivityDays, getRollingWindowStart, summarizeStatuses } from "./application-insights";

function makeApplication(id: number, status: Application["status"]): Application {
  return {
    id,
    company: `Company ${id}`,
    role: `Role ${id}`,
    job_url: null,
    date_applied: "2026-09-29",
    status,
    notes: null,
    follow_up_date: null,
    interview_date: null,
    assessment_date: null,
    deadline_date: null,
    created_at: "2026-09-29T10:00:00+00:00",
    updated_at: "2026-09-29T10:00:00+00:00",
  };
}

describe("summarizeStatuses", () => {
  it("counts every supported status, including empty statuses, and derives shares from the total", () => {
    const summary = summarizeStatuses([
      makeApplication(1, "Applied"),
      makeApplication(2, "Applied"),
      makeApplication(3, "Assessment"),
      makeApplication(4, "Rejected"),
    ]);

    expect(summary.total).toBe(4);
    expect(Object.keys(summary.byStatus)).toEqual(STATUSES);
    expect(summary.byStatus).toEqual({
      Applied: { count: 2, share: 0.5 },
      Assessment: { count: 1, share: 0.25 },
      Interview: { count: 0, share: 0 },
      Offer: { count: 0, share: 0 },
      Rejected: { count: 1, share: 0.25 },
    });
  });

  it("returns zero counts and shares when there are no applications", () => {
    const summary = summarizeStatuses([]);

    expect(summary.total).toBe(0);
    expect(Object.values(summary.byStatus)).toEqual(
      STATUSES.map(() => ({ count: 0, share: 0 })),
    );
  });
});

describe("daily application activity", () => {
  it("groups duplicate dates, includes both window boundaries, and excludes older and future records", () => {
    const applications = [
      makeApplication(1, "Applied"),
      makeApplication(2, "Offer"),
      makeApplication(3, "Interview"),
      makeApplication(4, "Rejected"),
    ].map((application, index) => ({
      ...application,
      date_applied: ["2025-10-06", "2026-10-06", "2025-10-05", "2026-10-07"][index],
    }));

    const days = getActivityDays(applications, "2026-10-06");
    const byDate = new Map(days.map((day) => [day.date, day.count]));

    expect(days[0].date).toBe("2025-10-06");
    expect(days.at(-1)?.date).toBe("2026-10-06");
    expect(byDate.get("2025-10-06")).toBe(1);
    expect(byDate.get("2026-10-06")).toBe(1);
    expect(byDate.has("2025-10-05")).toBe(false);
    expect(byDate.has("2026-10-07")).toBe(false);
    expect(summarizeStatuses(applications).total).toBe(4);
  });

  it("clamps the rolling start to the last valid day of the prior month", () => {
    expect(getRollingWindowStart("2024-02-29")).toBe("2023-02-28");
    expect(getRollingWindowStart("2026-03-31")).toBe("2025-03-31");
  });

  it("counts multiple applications on the same day and preserves date-only values", () => {
    const applications = [
      makeApplication(1, "Applied"),
      makeApplication(2, "Assessment"),
    ].map((application) => ({ ...application, date_applied: "2026-01-15" }));

    const day = getActivityDays(applications, "2026-01-15").at(-1);

    expect(day).toEqual({ date: "2026-01-15", count: 2, level: 2 });
  });
});