import { useDeferredValue, useEffect, useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  CircleAlert,
  Clock3,
  LayoutDashboard,
  List,
  ExternalLink,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import {
  ApiError,
  createApplication,
  getApplications,
  getCsrfToken,
  removeApplication,
  STATUSES,
  updateApplication,
  type Application,
  type ApplicationInput,
  type ApplicationStatus,
  type FieldErrors,
} from "./api";

type FormValues = {
  company: string;
  role: string;
  job_url: string;
  date_applied: string;
  status: ApplicationStatus;
  notes: string;
  follow_up_date: string;
  interview_date: string;
  assessment_date: string;
  deadline_date: string;
};

type DashboardAction = {
  application: Application;
  date: string;
  label: string;
};

const PIPELINE_STAGES: ApplicationStatus[] = [
  "Applied",
  "Assessment",
  "Interview",
  "Offer",
  "Rejected",
];

const EMPTY_FORM: FormValues = {
  company: "",
  role: "",
  job_url: "",
  date_applied: "",
  status: "Applied",
  notes: "",
  follow_up_date: "",
  interview_date: "",
  assessment_date: "",
  deadline_date: "",
};

function today(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function prettyDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function formFromApplication(application: Application): FormValues {
  return {
    company: application.company,
    role: application.role,
    job_url: application.job_url ?? "",
    date_applied: application.date_applied,
    status: application.status,
    notes: application.notes ?? "",
    follow_up_date: application.follow_up_date ?? "",
    interview_date: application.interview_date ?? "",
    assessment_date: application.assessment_date ?? "",
    deadline_date: application.deadline_date ?? "",
  };
}

function daysFromToday(value: string): number {
  return Math.round(
    (Date.parse(`${value}T00:00:00Z`) - Date.parse(`${today()}T00:00:00Z`)) / 86_400_000,
  );
}

function actionTiming(value: string): { text: string; urgency: string } {
  const days = daysFromToday(value);
  if (days < 0) return { text: `Overdue by ${Math.abs(days)} day${days === -1 ? "" : "s"}`, urgency: "overdue" };
  if (days === 0) return { text: "Today", urgency: "today" };
  if (days <= 7) return { text: `In ${days} day${days === 1 ? "" : "s"}`, urgency: "upcoming" };
  return { text: prettyDate(value), urgency: "scheduled" };
}

function percentage(part: number, total: number): string {
  return total ? `${Math.round((part / total) * 100)}%` : "0%";
}

export default function App() {
  const [csrfToken, setCsrfToken] = useState("");
  const [applications, setApplications] = useState<Application[]>([]);
  const [view, setView] = useState<"dashboard" | "applications">("dashboard");
  const [selectedApplicationId, setSelectedApplicationId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "">("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    let active = true;
    getCsrfToken()
      .then((result) => {
        if (active) setCsrfToken(result.csrf_token);
      })
      .catch(() => {
        if (active) setLoadError("The local service is unavailable. Start the app and try again.");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getApplications("", "")
      .then((result) => {
        if (active) {
          setApplications(result);
          setLoadError("");
        }
      })
      .catch(() => {
        if (active) setLoadError("Applications could not be loaded. Please try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  function openNewForm() {
    setView("applications");
    setEditingId(null);
    setValues({ ...EMPTY_FORM, date_applied: today() });
    setFieldErrors({});
    setEditorOpen(true);
    setNotice("");
  }

  function openEditForm(application: Application) {
    setView("applications");
    setEditingId(application.id);
    setValues(formFromApplication(application));
    setFieldErrors({});
    setEditorOpen(true);
    setNotice("");
  }

  function closeForm() {
    setEditorOpen(false);
    setEditingId(null);
    setFieldErrors({});
  }

  function updateField(field: keyof FormValues, value: string) {
    setValues((previous) => ({ ...previous, [field]: value }));
    setFieldErrors((previous) => {
      if (!(field in previous) && !("_form" in previous)) return previous;
      const next = { ...previous };
      delete next[field];
      delete next._form;
      return next;
    });
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!csrfToken) {
      setFieldErrors({ _form: "The local service is not ready. Refresh and try again." });
      return;
    }

    setSaving(true);
    setFieldErrors({});
    const payload: ApplicationInput = {
      ...values,
      job_url: values.job_url.trim() || null,
      notes: values.notes.trim() || null,
    };

    try {
      if (editingId === null) {
        await createApplication(payload, csrfToken);
        setNotice("Application added.");
      } else {
        await updateApplication(editingId, payload, csrfToken);
        setNotice("Application updated.");
      }
      closeForm();
      setRefreshKey((key) => key + 1);
    } catch (error) {
      if (error instanceof ApiError) {
        setFieldErrors(error.fields._form ? error.fields : error.fields);
        if (!Object.keys(error.fields).length) {
          setFieldErrors({ _form: error.message });
        }
      } else {
        setFieldErrors({ _form: "The application could not be saved. Please try again." });
      }
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(application: Application, nextStatus: ApplicationStatus) {
    if (!csrfToken) return;
    setLoadError("");
    try {
      await updateApplication(application.id, { status: nextStatus }, csrfToken);
      setApplications((current) =>
        current.map((item) =>
          item.id === application.id ? { ...item, status: nextStatus } : item,
        ),
      );
      setNotice(`${application.company} status updated to ${nextStatus}.`);
    } catch {
      setLoadError("Status could not be updated. Please try again.");
    }
  }

  async function confirmRemoval(application: Application) {
    const confirmed = window.confirm(
      `Remove the application for ${application.role} at ${application.company}? This cannot be undone.`,
    );
    if (!confirmed || !csrfToken) return;

    try {
      await removeApplication(application.id, csrfToken);
      setApplications((current) => current.filter((item) => item.id !== application.id));
      setNotice(`Application for ${application.company} removed.`);
    } catch {
      setLoadError("Application could not be removed. Please try again.");
    }
  }

  const hasFilters = search.trim().length > 0 || statusFilter !== "";
  const visibleApplications = applications.filter((application) => {
    const matchesSearch = `${application.company} ${application.role}`
      .toLocaleLowerCase()
      .includes(deferredSearch.trim().toLocaleLowerCase());
    return matchesSearch && (!statusFilter || application.status === statusFilter);
  });
  const selectedApplication = applications.find((item) => item.id === selectedApplicationId) ?? null;
  const totalApplications = applications.length;
  const submittedApplications = applications;
  const interviewCount = applications.filter((item) => item.status === "Interview").length;
  const offerCount = applications.filter((item) => item.status === "Offer").length;
  const interviewConversionCount = applications.filter((item) =>
    item.status === "Interview" || item.status === "Offer",
  ).length;
  const rejectionCount = applications.filter((item) => item.status === "Rejected").length;
  const respondedCount = applications.filter((item) =>
    ["Assessment", "Interview", "Offer", "Rejected"].includes(item.status),
  ).length;
  const followUpsRequired = applications.filter((item) =>
    item.follow_up_date && item.status !== "Offer" && item.status !== "Rejected"
      && daysFromToday(item.follow_up_date) <= 7,
  ).length;
  const pipelineCounts = PIPELINE_STAGES.map((status) => ({
    status,
    count: applications.filter((item) => item.status === status).length,
  }));
  const recentApplications = [...applications]
    .sort((left, right) => right.updated_at.localeCompare(left.updated_at))
    .slice(0, 5);
  const dashboardActions: DashboardAction[] = applications.flatMap((application) => {
    const actions: DashboardAction[] = [];
    if (application.follow_up_date && !["Offer", "Rejected"].includes(application.status)) {
      actions.push({ application, date: application.follow_up_date, label: "Follow up" });
    }
    if (application.interview_date) {
      actions.push({ application, date: application.interview_date, label: "Interview" });
    }
    if (application.assessment_date) {
      actions.push({ application, date: application.assessment_date, label: "Assessment" });
    }
    if (application.deadline_date) {
      actions.push({ application, date: application.deadline_date, label: "Deadline" });
    }
    return actions;
  }).sort((left, right) => left.date.localeCompare(right.date)).slice(0, 6);
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - 5 + index);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return {
      key,
      label: new Intl.DateTimeFormat(undefined, { month: "short" }).format(date),
      count: submittedApplications.filter((item) => item.date_applied.startsWith(key)).length,
    };
  });
  const maxMonthlyApplications = Math.max(1, ...months.map((month) => month.count));

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="wordmark" href="/" aria-label="NextRole home">
          <span className="wordmark-mark" aria-hidden="true"><ArrowUpRight size={18} strokeWidth={2.5} /></span>
          <span className="wordmark-copy">
            <strong>NextRole</strong>
            <small>Track today. Plan what's next.</small>
          </span>
        </a>
        <nav className="primary-nav" aria-label="Main navigation">
          <button
            className={view === "dashboard" ? "nav-link active" : "nav-link"}
            type="button"
            aria-current={view === "dashboard" ? "page" : undefined}
            onClick={() => { setView("dashboard"); setEditorOpen(false); }}
          >
            <LayoutDashboard size={16} aria-hidden="true" /> Dashboard
          </button>
          <button
            className={view === "applications" ? "nav-link active" : "nav-link"}
            type="button"
            aria-current={view === "applications" ? "page" : undefined}
            onClick={() => setView("applications")}
          >
            <List size={16} aria-hidden="true" /> Applications
          </button>
        </nav>
        <span className="local-indicator"><span aria-hidden="true" /> Private workspace</span>
      </header>

      <main className="workspace">
        <section className="page-heading" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">YOUR SEARCH, IN ORDER</p>
            <h1 id="page-title">{view === "dashboard" ? "Job search dashboard" : "Applications"}</h1>
            <p className="page-intro">{view === "dashboard" ? "Progress, priorities, and the next move." : "A clear view of every opportunity and what comes next."}</p>
          </div>
          <button className="button button-primary" type="button" onClick={openNewForm}>
            <Plus size={18} aria-hidden="true" />
            <span>Add application</span>
          </button>
        </section>

        {notice && <p className="notice" role="status">{notice}</p>}
        {loadError && <p className="alert" role="alert">{loadError}</p>}

        {view === "dashboard" && (
          <div className="dashboard-content" aria-busy={loading}>
            <section className="summary-grid" aria-label="Application summary">
              {[
                { label: "Total applications", value: totalApplications, icon: BriefcaseBusiness, tone: "green" },
                { label: "Interviews", value: interviewCount, icon: CalendarDays, tone: "yellow" },
                { label: "Offers", value: offerCount, icon: ArrowUpRight, tone: "green" },
                { label: "Rejections", value: rejectionCount, icon: CircleAlert, tone: "coral" },
                { label: "Follow-ups due", value: followUpsRequired, icon: Clock3, tone: "yellow" },
              ].map(({ label, value, icon: Icon, tone }) => (
                <article className={`summary-card tone-${tone}`} key={label}>
                  <div className="summary-card-top"><span>{label}</span><Icon size={17} aria-hidden="true" /></div>
                  <strong>{loading ? "–" : value}</strong>
                </article>
              ))}
            </section>

            <section className="dashboard-section pipeline-section" aria-labelledby="pipeline-title">
              <div className="section-heading">
                <div><p className="eyebrow">AT A GLANCE</p><h2 id="pipeline-title">Application pipeline</h2></div>
                <button className="text-action" type="button" onClick={() => setView("applications")}>View applications <ArrowUpRight size={15} aria-hidden="true" /></button>
              </div>
              <div className="pipeline-grid">
                {pipelineCounts.map(({ status, count }, index) => (
                  <button
                    type="button"
                    className={`pipeline-stage stage-${status.toLowerCase()}`}
                    key={status}
                    onClick={() => { setStatusFilter(status); setSearch(""); setView("applications"); }}
                  >
                    <span className="pipeline-number">{loading ? "–" : count}</span>
                    <span>{status}</span>
                    <span className="pipeline-track" aria-hidden="true"><span style={{ width: `${totalApplications ? Math.max(4, (count / totalApplications) * 100) : 0}%` }} /></span>
                    {index < pipelineCounts.length - 1 && <span className="pipeline-separator" aria-hidden="true" />}
                  </button>
                ))}
              </div>
            </section>

            <div className="dashboard-columns">
              <section className="dashboard-section actions-section" aria-labelledby="actions-title">
                <div className="section-heading">
                  <div><p className="eyebrow">YOUR NEXT MOVES</p><h2 id="actions-title">Upcoming actions</h2></div>
                  <span className="section-count">{dashboardActions.length}</span>
                </div>
                {loading ? <p className="dashboard-empty">Loading actions…</p> : dashboardActions.length === 0 ? (
                  <div className="dashboard-empty"><span className="empty-check" aria-hidden="true">✓</span><p>No actions scheduled. Add dates to an application to keep upcoming steps in view.</p></div>
                ) : (
                  <ul className="action-list">
                    {dashboardActions.map((action, index) => {
                      const timing = actionTiming(action.date);
                      return (
                        <li className={`action-row urgency-${timing.urgency}`} key={`${action.application.id}-${action.label}-${index}`}>
                          <span className="action-marker" aria-hidden="true"><CalendarDays size={16} /></span>
                          <button className="action-copy" type="button" onClick={() => setSelectedApplicationId(action.application.id)}>
                            <strong>{action.label} <span>·</span> {action.application.company}</strong>
                            <span>{action.application.role}</span>
                          </button>
                          <div className="action-date"><strong>{timing.text}</strong><time dateTime={action.date}>{prettyDate(action.date)}</time></div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section className="dashboard-section recent-section" aria-labelledby="recent-title">
                <div className="section-heading">
                  <div><p className="eyebrow">LATEST ACTIVITY</p><h2 id="recent-title">Recent applications</h2></div>
                  <button className="text-action" type="button" onClick={() => setView("applications")}>All <ArrowUpRight size={15} aria-hidden="true" /></button>
                </div>
                {loading ? <p className="dashboard-empty">Loading applications…</p> : recentApplications.length === 0 ? (
                  <div className="dashboard-empty"><p>No applications yet. Add your first role to start tracking progress.</p><button className="button button-primary" type="button" onClick={openNewForm}><Plus size={16} aria-hidden="true" /> Add your first application</button></div>
                ) : (
                  <ul className="recent-list">
                    {recentApplications.map((application) => (
                      <li key={application.id}>
                        <button className="recent-item" type="button" onClick={() => setSelectedApplicationId(application.id)}>
                          <span className="company-glyph" aria-hidden="true">{application.company.trim().charAt(0).toUpperCase()}</span>
                          <span className="recent-copy"><strong>{application.company}</strong><span>{application.role}</span></span>
                          <span className={`status-pill status-${application.status.toLowerCase()}`}>{application.status}</span>
                          <time dateTime={application.date_applied}>{prettyDate(application.date_applied)}</time>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <section className="dashboard-section metrics-section" aria-labelledby="metrics-title">
              <div className="section-heading">
                <div><p className="eyebrow">WHAT'S WORKING</p><h2 id="metrics-title">Job search metrics</h2></div>
              </div>
              <div className="metrics-grid">
                <div className="metric-value"><strong>{percentage(respondedCount, submittedApplications.length)}</strong><span>Response rate</span><small>{respondedCount} of {submittedApplications.length} submitted</small></div>
                <div className="metric-value"><strong>{percentage(interviewConversionCount, submittedApplications.length)}</strong><span>Interview conversion</span><small>{interviewConversionCount} of {submittedApplications.length} reached interview</small></div>
                <div className="metric-value"><strong>{percentage(offerCount, submittedApplications.length)}</strong><span>Offer rate</span><small>{offerCount} of {submittedApplications.length} submitted</small></div>
                <div className="monthly-chart" aria-label="Applications submitted over the last six months">
                  <span className="chart-title">Applications submitted</span>
                  <div className="month-bars">
                    {months.map((month) => (
                      <div className="month-column" key={month.key}>
                        <span className="month-count">{month.count}</span>
                        <span className="month-bar-track"><span style={{ height: `${month.count ? Math.max(8, (month.count / maxMonthlyApplications) * 100) : 0}%` }} /></span>
                        <span className="month-label">{month.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {selectedApplication && (
          <div className="details-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedApplicationId(null); }}>
            <section className="details-dialog" role="dialog" aria-modal="true" aria-labelledby="details-title">
              <div className="details-header"><div><p className="eyebrow">APPLICATION DETAILS</p><h2 id="details-title">{selectedApplication.role}</h2><p>{selectedApplication.company}</p></div><button className="icon-button" type="button" aria-label="Close details" onClick={() => setSelectedApplicationId(null)}><X size={18} aria-hidden="true" /></button></div>
              <dl className="details-grid">
                <div><dt>Status</dt><dd><span className={`status-pill status-${selectedApplication.status.toLowerCase()}`}>{selectedApplication.status}</span></dd></div>
                <div><dt>Date applied</dt><dd>{prettyDate(selectedApplication.date_applied)}</dd></div>
                {selectedApplication.follow_up_date && <div><dt>Follow-up</dt><dd>{prettyDate(selectedApplication.follow_up_date)}</dd></div>}
                {selectedApplication.interview_date && <div><dt>Interview</dt><dd>{prettyDate(selectedApplication.interview_date)}</dd></div>}
                {selectedApplication.assessment_date && <div><dt>Assessment</dt><dd>{prettyDate(selectedApplication.assessment_date)}</dd></div>}
                {selectedApplication.deadline_date && <div><dt>Deadline</dt><dd>{prettyDate(selectedApplication.deadline_date)}</dd></div>}
              </dl>
              {selectedApplication.notes && <p className="details-notes">{selectedApplication.notes}</p>}
              {selectedApplication.job_url && <a className="posting-link" href={selectedApplication.job_url} target="_blank" rel="noreferrer">View posting <ExternalLink size={13} aria-hidden="true" /></a>}
              <div className="form-actions"><button className="button button-quiet" type="button" onClick={() => setSelectedApplicationId(null)}>Close</button><button className="button button-primary" type="button" onClick={() => { setSelectedApplicationId(null); openEditForm(selectedApplication); }}><Pencil size={15} aria-hidden="true" /> Edit application</button></div>
            </section>
          </div>
        )}

        {editorOpen && (
          <section className="editor-panel" aria-labelledby="editor-title">
            <div className="editor-heading">
              <div>
                <p className="eyebrow">APPLICATION DETAILS</p>
                <h2 id="editor-title">{editingId === null ? "Add an application" : "Edit application"}</h2>
              </div>
              <button className="icon-button" type="button" aria-label="Close form" onClick={closeForm}>
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <form className="application-form" onSubmit={submitForm} noValidate>
              {fieldErrors._form && <p className="alert form-alert" role="alert">{fieldErrors._form}</p>}
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="company">Company <span aria-hidden="true">*</span></label>
                  <input
                    autoFocus
                    id="company"
                    name="company"
                    autoComplete="organization"
                    maxLength={200}
                    value={values.company}
                    onChange={(event) => updateField("company", event.target.value)}
                    aria-invalid={Boolean(fieldErrors.company)}
                    aria-describedby={fieldErrors.company ? "company-error" : undefined}
                    required
                  />
                  {fieldErrors.company && <p className="field-error" id="company-error">{fieldErrors.company}</p>}
                </div>
                <div className="field">
                  <label htmlFor="role">Role <span aria-hidden="true">*</span></label>
                  <input
                    id="role"
                    name="role"
                    maxLength={200}
                    value={values.role}
                    onChange={(event) => updateField("role", event.target.value)}
                    aria-invalid={Boolean(fieldErrors.role)}
                    aria-describedby={fieldErrors.role ? "role-error" : undefined}
                    required
                  />
                  {fieldErrors.role && <p className="field-error" id="role-error">{fieldErrors.role}</p>}
                </div>
                <div className="field">
                  <label htmlFor="date_applied">Date applied <span aria-hidden="true">*</span></label>
                  <input
                    id="date_applied"
                    name="date_applied"
                    type="date"
                    max={today()}
                    value={values.date_applied}
                    onChange={(event) => updateField("date_applied", event.target.value)}
                    aria-invalid={Boolean(fieldErrors.date_applied)}
                    aria-describedby={fieldErrors.date_applied ? "date_applied-error" : undefined}
                    required
                  />
                  {fieldErrors.date_applied && <p className="field-error" id="date_applied-error">{fieldErrors.date_applied}</p>}
                </div>
                <div className="field">
                  <label htmlFor="job_url">Job URL <span className="optional">Optional</span></label>
                  <input
                    id="job_url"
                    name="job_url"
                    type="url"
                    inputMode="url"
                    maxLength={2048}
                    placeholder="https://"
                    value={values.job_url}
                    onChange={(event) => updateField("job_url", event.target.value)}
                    aria-invalid={Boolean(fieldErrors.job_url)}
                    aria-describedby={fieldErrors.job_url ? "job_url-error" : undefined}
                  />
                  {fieldErrors.job_url && <p className="field-error" id="job_url-error">{fieldErrors.job_url}</p>}
                </div>
                <div className="field">
                  <label htmlFor="status">Status</label>
                  <select
                    id="status"
                    name="status"
                    value={values.status}
                    onChange={(event) => updateField("status", event.target.value)}
                    aria-invalid={Boolean(fieldErrors.status)}
                    aria-describedby={fieldErrors.status ? "status-error" : undefined}
                  >
                    {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                  {fieldErrors.status && <p className="field-error" id="status-error">{fieldErrors.status}</p>}
                </div>
                {([
                  ["follow_up_date", "Follow-up date"],
                  ["interview_date", "Interview date"],
                  ["assessment_date", "Assessment date"],
                  ["deadline_date", "Application deadline"],
                ] as const).map(([field, label]) => (
                  <div className="field" key={field}>
                    <label htmlFor={field}>{label} <span className="optional">Optional</span></label>
                    <input
                      id={field}
                      name={field}
                      type="date"
                      value={values[field]}
                      onChange={(event) => updateField(field, event.target.value)}
                      aria-invalid={Boolean(fieldErrors[field])}
                      aria-describedby={fieldErrors[field] ? `${field}-error` : undefined}
                    />
                    {fieldErrors[field] && <p className="field-error" id={`${field}-error`}>{fieldErrors[field]}</p>}
                  </div>
                ))}
                <div className="field field-notes">
                  <label htmlFor="notes">Notes <span className="optional">Optional</span></label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    maxLength={5000}
                    value={values.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                    aria-invalid={Boolean(fieldErrors.notes)}
                    aria-describedby={fieldErrors.notes ? "notes-error" : undefined}
                  />
                  {fieldErrors.notes && <p className="field-error" id="notes-error">{fieldErrors.notes}</p>}
                </div>
              </div>
              <div className="form-actions">
                <button className="button button-quiet" type="button" onClick={closeForm}>Cancel</button>
                <button className="button button-primary" type="submit" disabled={saving}>
                  {saving ? "Saving…" : editingId === null ? "Save application" : "Save changes"}
                </button>
              </div>
            </form>
          </section>
        )}

        {view === "applications" && <section className="list-section" aria-labelledby="list-title" aria-busy={loading}>
          <div className="list-header">
            <div className="list-title-wrap">
              <h2 id="list-title">Your applications</h2>
              {!loading && <span className="result-count">{visibleApplications.length}</span>}
            </div>
            <div className="filters">
              <div className="search-field">
                <Search size={17} aria-hidden="true" />
                <label className="sr-only" htmlFor="application-search">Search by company or role</label>
                <input
                  id="application-search"
                  type="text"
                  role="searchbox"
                  inputMode="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search company or role"
                />
                {hasFilters && (
                  <button
                    className="search-clear"
                    type="button"
                    aria-label="Clear search and status filters"
                    title="Clear search and status filters"
                    onClick={() => { setSearch(""); setStatusFilter(""); }}
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
              <label className="filter-select">
                <span className="sr-only">Filter by status</span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as ApplicationStatus | "")}
                >
                  <option value="">All statuses</option>
                  {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
            </div>
          </div>

          {loading ? (
            <p className="list-message" role="status">Loading applications…</p>
          ) : visibleApplications.length === 0 ? (
            <div className="empty-state">
              <div className="empty-mark" aria-hidden="true"><Plus size={22} /></div>
              <h3>{hasFilters ? "No matches found" : "Your next move starts here"}</h3>
              <p>{hasFilters ? "Try another search or clear your filters." : "Keep each application, follow-up, and outcome in one place."}</p>
              {hasFilters ? (
                <button className="button button-quiet" type="button" onClick={() => { setSearch(""); setStatusFilter(""); }}>Clear search and filters</button>
              ) : (
                <button className="button button-primary" type="button" onClick={openNewForm}>
                  <Plus size={17} aria-hidden="true" />
                  <span>Add your first application</span>
                </button>
              )}
            </div>
          ) : (
            <ul className="application-list" aria-label="Saved applications">
              {visibleApplications.map((application) => (
                <li className="application-row" key={application.id}>
                  <div className="application-main">
                    <div className="company-glyph" aria-hidden="true">{application.company.trim().charAt(0).toUpperCase()}</div>
                    <div className="application-copy">
                      <h3>{application.company}</h3>
                      <p className="role-name">{application.role}</p>
                      {application.notes && <p className="application-notes">{application.notes}</p>}
                      {application.job_url && (
                        <a className="posting-link" href={application.job_url} target="_blank" rel="noreferrer">
                          <span>View posting</span>
                          <ExternalLink size={13} aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="application-meta">
                    <label className="status-label" htmlFor={`status-${application.id}`}>Status</label>
                    <select
                      id={`status-${application.id}`}
                      className={`status-select status-${application.status.toLowerCase()}`}
                      value={application.status}
                      onChange={(event) => changeStatus(application, event.target.value as ApplicationStatus)}
                    >
                      {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                    <time dateTime={application.date_applied}>Applied {prettyDate(application.date_applied)}</time>
                  </div>
                  <div className="row-actions">
                    <button className="icon-button" type="button" aria-label={`Edit ${application.role} at ${application.company}`} onClick={() => openEditForm(application)}>
                      <Pencil size={17} aria-hidden="true" />
                    </button>
                    <button className="icon-button icon-button-danger" type="button" aria-label={`Remove ${application.role} at ${application.company}`} onClick={() => void confirmRemoval(application)}>
                      <Trash2 size={17} aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>}
        <footer className="workspace-footer">
          <span>Stored on this device</span>
          <span>NextRole <span aria-hidden="true">·</span> Personal edition</span>
        </footer>
      </main>
    </div>
  );
}