import { useDeferredValue, useEffect, useState, type FormEvent } from "react";
import {
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
};

const EMPTY_FORM: FormValues = {
  company: "",
  role: "",
  job_url: "",
  date_applied: "",
  status: "Applied",
  notes: "",
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
  };
}

export default function App() {
  const [csrfToken, setCsrfToken] = useState("");
  const [applications, setApplications] = useState<Application[]>([]);
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
    getApplications(deferredSearch, statusFilter)
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
  }, [deferredSearch, statusFilter, refreshKey]);

  function openNewForm() {
    setEditingId(null);
    setValues({ ...EMPTY_FORM, date_applied: today() });
    setFieldErrors({});
    setEditorOpen(true);
    setNotice("");
  }

  function openEditForm(application: Application) {
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

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="wordmark" href="/" aria-label="Application Ledger home">
          <span className="wordmark-mark" aria-hidden="true">A</span>
          <span>Application Ledger</span>
        </a>
        <span className="local-indicator"><span aria-hidden="true" /> Private workspace</span>
      </header>

      <main className="workspace">
        <section className="page-heading" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">YOUR SEARCH, IN ORDER</p>
            <h1 id="page-title">Applications</h1>
            <p className="page-intro">A clear view of every opportunity and what comes next.</p>
          </div>
          <button className="button button-primary" type="button" onClick={openNewForm}>
            <Plus size={18} aria-hidden="true" />
            <span>Add application</span>
          </button>
        </section>

        {notice && <p className="notice" role="status">{notice}</p>}
        {loadError && <p className="alert" role="alert">{loadError}</p>}

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

        <section className="list-section" aria-labelledby="list-title" aria-busy={loading}>
          <div className="list-header">
            <div className="list-title-wrap">
              <h2 id="list-title">Your applications</h2>
              {!loading && <span className="result-count">{applications.length}</span>}
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
          ) : applications.length === 0 ? (
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
              {applications.map((application) => (
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
        </section>
        <footer className="workspace-footer">
          <span>Stored on this device</span>
          <span>Application Ledger <span aria-hidden="true">·</span> Personal edition</span>
        </footer>
      </main>
    </div>
  );
}