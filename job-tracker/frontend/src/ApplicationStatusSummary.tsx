import { useState } from "react";

import { STATUSES, type Application } from "./api";
import { summarizeStatuses } from "./application-insights";

type ApplicationStatusSummaryProps = {
  applications: Application[];
  loading: boolean;
};

const STATUS_COLORS: Record<(typeof STATUSES)[number], string> = {
  Applied: "#5b8264",
  Assessment: "#c28a2c",
  Interview: "#357b78",
  Offer: "#1b6048",
  Rejected: "#b6533e",
};
const OUTCOME_STATUSES = STATUSES.filter((status) => status !== "Applied");

export default function ApplicationStatusSummary({
  applications,
  loading,
}: ApplicationStatusSummaryProps) {
  const summary = summarizeStatuses(applications);
  const [activeStatus, setActiveStatus] = useState<(typeof STATUSES)[number] | null>(null);

  return (
    <section className="status-summary" aria-labelledby="status-summary-title" aria-busy={loading}>
      <div className="summary-heading">
        <div>
          <p className="eyebrow">ALL-TIME TOTAL</p>
        </div>
      </div>
      {loading ? (
        <p className="summary-empty" role="status">Loading outcomes…</p>
      ) : (
        <>
          <div className="status-graph" role="group" aria-label="Applications by current outcome">
            {OUTCOME_STATUSES.map((status) => {
              const details = summary.byStatus[status];
              const percent = Math.round(details.share * 100);
              const active = activeStatus === status;

              return (
                <button
                  className={`status-graph-row${active ? " is-active" : ""}`}
                  type="button"
                  key={status}
                  aria-label={`${status}, ${details.count} ${details.count === 1 ? "application" : "applications"}, ${percent}%`}
                  onMouseEnter={() => setActiveStatus(status)}
                  onMouseLeave={() => setActiveStatus(null)}
                  onFocus={() => setActiveStatus(status)}
                  onBlur={() => setActiveStatus(null)}
                >
                  <span className="status-graph-label">
                    <span className="status-swatch" style={{ backgroundColor: STATUS_COLORS[status] }} aria-hidden="true" />
                    <span>{status}</span>
                  </span>
                  <span className="status-track" aria-hidden="true">
                    <span
                      className="status-track-value"
                      style={{
                        width: `${details.share * 100}%`,
                        backgroundColor: STATUS_COLORS[status],
                      }}
                    />
                  </span>
                  <span className="status-count">{details.count}</span>
                  {active && (
                    <span className="status-tooltip" role="tooltip">
                      {status}: {details.count} of {summary.total} {summary.total === 1 ? "application" : "applications"} ({percent}%)
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {summary.total === 0 && <p className="summary-empty">No applications yet</p>}
        </>
      )}
    </section>
  );
}