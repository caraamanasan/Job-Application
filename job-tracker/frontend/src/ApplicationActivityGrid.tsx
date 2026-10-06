import { useMemo, useRef, useState, type KeyboardEvent } from "react";

import type { Application } from "./api";
import { getActivityDays, type ActivityDay } from "./application-insights";

type ApplicationActivityGridProps = {
  applications: Application[];
  today?: string;
};

type CalendarCell = ActivityDay | null;

function localToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDay(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day, 12));
}

function makeWeeks(days: ActivityDay[]): CalendarCell[][] {
  const first = new Date(`${days[0].date}T12:00:00`);
  const cells: CalendarCell[] = [
    ...Array.from({ length: first.getDay() }, () => null),
    ...days,
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: CalendarCell[][] = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }
  return weeks;
}

export default function ApplicationActivityGrid({
  applications,
  today = localToday(),
}: ApplicationActivityGridProps) {
  const days = useMemo(() => getActivityDays(applications, today), [applications, today]);
  const weeks = useMemo(() => makeWeeks(days), [days]);
  const [selectedDate, setSelectedDate] = useState(today);
  const cellRefs = useRef(new Map<string, HTMLButtonElement>());
  const selectedDay = days.find((day) => day.date === selectedDate) ?? days[days.length - 1];

  function moveFocus(event: KeyboardEvent<HTMLButtonElement>, day: ActivityDay) {
    const offset = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    }[event.key];
    if (!offset) return;

    event.preventDefault();
    const index = days.findIndex((candidate) => candidate.date === day.date);
    const next = days[index + offset];
    if (next) {
      setSelectedDate(next.date);
      cellRefs.current.get(next.date)?.focus();
    }
  }

  return (
    <section className="activity-summary" aria-labelledby="activity-summary-title">
      <div className="activity-heading">
        <div>
          <p className="eyebrow">DAILY MOMENTUM</p>
          <h3 id="activity-summary-title">Application activity</h3>
        </div>
        <span className="activity-period">Past 12 months</span>
      </div>

      <p className="activity-detail" aria-live="polite">
        {formatDay(selectedDay.date)} · {selectedDay.count} {selectedDay.count === 1 ? "application" : "applications"}
      </p>

      <div className="activity-scroll" tabIndex={0} aria-label="Scrollable daily application activity">
        <div className="activity-calendar">
          <div className="weekday-labels" aria-hidden="true">
            <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
          </div>
          <div className="activity-grid" role="grid" aria-label="Daily applications over the past 12 months">
            {weeks.map((week, weekIndex) => (
              <div className="activity-week" role="row" key={weekIndex}>
                {week.map((day, dayIndex) => day ? (
                  <button
                    className={`activity-cell activity-level-${day.level}`}
                    type="button"
                    role="gridcell"
                    key={day.date}
                    aria-label={`${formatDay(day.date)}: ${day.count} ${day.count === 1 ? "application" : "applications"}`}
                    aria-selected={day.date === selectedDay.date}
                    tabIndex={day.date === selectedDay.date ? 0 : -1}
                    ref={(element) => {
                      if (element) cellRefs.current.set(day.date, element);
                      else cellRefs.current.delete(day.date);
                    }}
                    onFocus={() => setSelectedDate(day.date)}
                    onMouseEnter={() => setSelectedDate(day.date)}
                    onKeyDown={(event) => moveFocus(event, day)}
                  />
                ) : (
                  <span className="activity-cell activity-cell-empty" aria-hidden="true" key={`${weekIndex}-${dayIndex}`} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="activity-footer">
        {days.every((day) => day.count === 0) && (
          <p className="activity-empty">No applications recorded in this period</p>
        )}
        <div className="activity-legend" aria-label="Activity intensity legend">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <span className={`activity-cell activity-level-${level}`} aria-hidden="true" key={level} />
          ))}
          <span>More</span>
        </div>
      </div>
    </section>
  );
}