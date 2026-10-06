import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "./api";
import App from "./App";

vi.mock("./api", async (importOriginal) => {
  const original = await importOriginal<typeof import("./api")>();
  return {
    ...original,
    createApplication: vi.fn(),
    getAllApplications: vi.fn(),
    getApplications: vi.fn(),
    getCsrfToken: vi.fn(),
    removeApplication: vi.fn(),
    updateApplication: vi.fn(),
  };
});

function makeApplication(overrides: Partial<api.Application> = {}): api.Application {
  return {
    id: 1,
    company: "Example Co",
    role: "Claims Analyst",
    job_url: null,
    date_applied: "2026-09-29",
    status: "Applied",
    notes: null,
    follow_up_date: null,
    interview_date: null,
    assessment_date: null,
    deadline_date: null,
    created_at: "2026-09-29T10:00:00+00:00",
    updated_at: "2026-09-29T10:00:00+00:00",
    ...overrides,
  };
}

function getSectionButton(container: HTMLElement, label: string): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll<HTMLButtonElement>(".primary-nav .nav-link"))
    .find((item) => item.textContent?.trim().endsWith(label));
  if (!button) throw new Error(`Missing section button: ${label}`);
  return button;
}

function getStatusRow(container: HTMLElement, label: string): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll<HTMLButtonElement>(".status-graph-row"))
    .find((item) => item.getAttribute("aria-label")?.startsWith(label));
  if (!button) throw new Error(`Missing status row: ${label}`);
  return button;
}

describe("Application tracker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getCsrfToken).mockResolvedValue({ csrf_token: "test-token" });
    vi.mocked(api.getAllApplications).mockResolvedValue([]);
    vi.mocked(api.getApplications).mockResolvedValue([]);
    vi.mocked(api.createApplication).mockResolvedValue(makeApplication());
    vi.mocked(api.updateApplication).mockResolvedValue(makeApplication());
    vi.mocked(api.removeApplication).mockResolvedValue(undefined);
  });

  it("shows a useful initial empty state and opens the add form", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    const logo = screen.getByRole("link", { name: "NextRole home" });
    expect(logo.querySelector(".wordmark-mark svg")).toBeInTheDocument();
    expect(logo.querySelector(".wordmark-mark")).not.toHaveTextContent("A");
    expect(await screen.findByRole("heading", { name: "Job search dashboard" })).toBeInTheDocument();
    expect(screen.getByText("Track today. Plan what's next.")).toBeInTheDocument();
    expect(await screen.findByText(/No applications yet/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Applications" }));
    await user.click(screen.getByRole("button", { name: "Add application" }));
    expect(screen.getByRole("heading", { name: "Add an application" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Company/)).toBeRequired();
    expect(screen.getByLabelText(/^Role/)).toBeRequired();
  }, 15000);

  it("shows pipeline progress and prioritizes actions on the dashboard", async () => {
    const user = userEvent.setup();
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const application = makeApplication({
      status: "Interview",
      follow_up_date: yesterday,
    });
    vi.mocked(api.getApplications).mockResolvedValue([application]);
    render(<App />);

    expect(await screen.findByText("Total applications")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Follow up.*Example Co/ })).toBeInTheDocument();
    expect(screen.getByText(/Overdue by 1 day/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1Interview" })).toBeInTheDocument();
    expect(screen.queryByText("Saved")).not.toBeInTheDocument();
    expect(screen.queryByText("Screening")).not.toBeInTheDocument();

    const recentSection = screen.getByRole("region", { name: "Recent applications" });
    await user.click(within(recentSection).getByRole("button", { name: /Example Co/ }));
    expect(screen.getByRole("dialog", { name: "Claims Analyst" })).toBeInTheDocument();
  }, 15000);

  it("does not offer Saved or Screening in the application status selector", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Applications" }));
    await user.click(await screen.findByRole("button", { name: "Add application" }));
    const statusSelect = screen.getByRole("combobox", { name: "Status" });
    const options = within(statusSelect).getAllByRole("option").map((option) => option.textContent);
    expect(options).toEqual(["Applied", "Assessment", "Interview", "Offer", "Rejected"]);
  });

  it("shows all-time status counts independently of list filters with keyboard details", async () => {
    const user = userEvent.setup();
    const records = [
      makeApplication({ id: 1, status: "Applied" }),
      makeApplication({ id: 2, status: "Applied" }),
      makeApplication({ id: 3, status: "Assessment" }),
      makeApplication({ id: 4, status: "Rejected" }),
    ];
    vi.mocked(api.getAllApplications).mockResolvedValue(records);
    vi.mocked(api.getApplications)
      .mockResolvedValueOnce(records)
      .mockResolvedValueOnce([records[3]]);
    const { container } = render(<App />);

    await user.click(screen.getByRole("button", { name: "Applications" }));
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Filter by status" }),
      "Rejected",
    );
    expect(container.querySelector(".result-count")).toHaveTextContent("1");
    fireEvent.click(getSectionButton(container, "Insights"));

    expect(container.querySelector("#insights-title")).toHaveTextContent("Application insights");
    expect(container.querySelector("#status-summary-title")).toHaveTextContent("4 applications");
    expect(container.querySelectorAll(".status-graph-label")).toHaveLength(4);
    expect(container.querySelector(".status-graph")).not.toHaveTextContent("Applied");
    const insightSections = Array.from(container.querySelectorAll(".insights-layout > section"));
    expect(insightSections.map((section) => section.className)).toEqual(["status-summary", "activity-summary"]);

    const assessmentDetail = getStatusRow(container, "Assessment");
    fireEvent.focus(assessmentDetail);
    expect(container.querySelector('[role="tooltip"]')).toHaveTextContent("Assessment: 1 of 4 applications (25%)");
  }, 15000);

  it("shows an explicit zero-total state in Insights", async () => {
    const { container } = render(<App />);

    fireEvent.click(getSectionButton(container, "Insights"));

    await waitFor(() => {
      expect(container.querySelector("#status-summary-title")).toHaveTextContent("0 applications");
      expect(container.querySelector(".summary-empty")).toHaveTextContent("No applications yet");
    });
  });

  it("distinguishes an Insights load failure from an empty collection and allows retry", async () => {
    vi.mocked(api.getAllApplications)
      .mockRejectedValueOnce(new Error("service unavailable"))
      .mockResolvedValueOnce([makeApplication()]);
    const { container } = render(<App />);

    fireEvent.click(getSectionButton(container, "Insights"));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Application insights could not be loaded. Please try again.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => {
      expect(container.querySelector("#status-summary-title")).toHaveTextContent("1 application");
    });
  });

  it("updates the all-time summary after a saved status change and removal", async () => {
    const applied = makeApplication({ id: 1, status: "Applied" });
    const rejected = makeApplication({ id: 2, status: "Rejected" });
    const updated = { ...applied, status: "Offer" as const };
    vi.mocked(api.getAllApplications).mockResolvedValue([applied, rejected]);
    vi.mocked(api.getApplications).mockResolvedValue([applied, rejected]);
    vi.mocked(api.updateApplication).mockResolvedValue(updated);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const { container } = render(<App />);

    fireEvent.click(getSectionButton(container, "Applications"));
    const savedList = await screen.findByRole("list", { name: "Saved applications" });
    fireEvent.change(within(savedList).getAllByRole("combobox")[0], { target: { value: "Offer" } });
    await waitFor(() => expect(api.updateApplication).toHaveBeenCalled());
    fireEvent.click(getSectionButton(container, "Insights"));
    fireEvent.focus(getStatusRow(container, "Offer"));
    expect(container.querySelector('[role="tooltip"]')).toHaveTextContent("Offer: 1 of 2 applications (50%)");

    fireEvent.click(getSectionButton(container, "Applications"));
    fireEvent.click(screen.getAllByRole("button", { name: "Remove Claims Analyst at Example Co" })[0]);
    await waitFor(() => expect(screen.getByText("1", { selector: ".result-count" })).toBeInTheDocument());
    fireEvent.click(getSectionButton(container, "Insights"));
    expect(container.querySelector("#status-summary-title")).toHaveTextContent("1 application");
    fireEvent.focus(getStatusRow(container, "Rejected"));
    expect(container.querySelector('[role="tooltip"]')).toHaveTextContent("Rejected: 1 of 1 application (100%)");
    confirm.mockRestore();
  });

  it("updates the activity day after an applied-date edit and removal", async () => {
    const current = makeApplication({ date_applied: "2026-09-29" });
    const today = new Date();
    const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 10);
    const moved = { ...current, date_applied: localDate };
    vi.mocked(api.getAllApplications)
      .mockResolvedValueOnce([current])
      .mockResolvedValueOnce([moved]);
    vi.mocked(api.getApplications).mockResolvedValue([current]);
    vi.mocked(api.updateApplication).mockResolvedValue(moved);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { container } = render(<App />);

    fireEvent.click(getSectionButton(container, "Applications"));
    fireEvent.click(await screen.findByRole("button", { name: "Edit Claims Analyst at Example Co" }));
    fireEvent.change(screen.getByLabelText(/Date applied/), { target: { value: localDate } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(api.updateApplication).toHaveBeenCalled());
    fireEvent.click(getSectionButton(container, "Insights"));

    const dateLabel = new Intl.DateTimeFormat(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date(`${localDate}T12:00:00`));
    const todayCellSelector = `[role="gridcell"][aria-label="${dateLabel}: 1 application"]`;
    await waitFor(() => expect(container.querySelector(todayCellSelector)).not.toBeNull());

    fireEvent.click(getSectionButton(container, "Applications"));
    fireEvent.click(screen.getByRole("button", { name: "Remove Claims Analyst at Example Co" }));
    fireEvent.click(getSectionButton(container, "Insights"));
    const removedCellSelector = `[role="gridcell"][aria-label="${dateLabel}: 0 applications"]`;
    await waitFor(() => expect(container.querySelector(removedCellSelector)).not.toBeNull());
  }, 15000);

  it("creates an application with the Applied default and displays it", async () => {
    const user = userEvent.setup();
    const saved = makeApplication();
    vi.mocked(api.getApplications)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([saved]);
    vi.mocked(api.createApplication).mockResolvedValue(saved);
    const { container } = render(<App />);

    await user.click(screen.getByRole("button", { name: "Applications" }));
    await user.click(await screen.findByRole("button", { name: "Add application" }));
    await user.type(screen.getByLabelText(/Company/), saved.company);
    await user.type(screen.getByLabelText(/^Role/), saved.role);
    fireEvent.change(screen.getByLabelText(/Date applied/), {
      target: { value: saved.date_applied },
    });
    await user.click(screen.getByRole("button", { name: "Save application" }));

    expect(await screen.findByText(saved.company)).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Status" })).toHaveValue("Applied");
    expect(api.createApplication).toHaveBeenCalledWith(
      expect.objectContaining({ status: "Applied" }),
      "test-token",
    );
    expect(container.querySelector(".notice")).toHaveTextContent("Application added.");
    fireEvent.click(getSectionButton(container, "Insights"));
    expect(container.querySelector(".notice")).toBeNull();
  });

  it("shows field-specific server validation and preserves entered values", async () => {
    const user = userEvent.setup();
    vi.mocked(api.createApplication).mockRejectedValue(
      new api.ApiError("Validation failed.", { company: "Company is required." }),
    );
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Applications" }));
    await user.click(await screen.findByRole("button", { name: "Add application" }));
    const companyInput = screen.getByLabelText(/Company/);
    await user.type(companyInput, "Entered Co");
    await user.type(screen.getByLabelText(/^Role/), "Analyst");
    fireEvent.change(screen.getByLabelText(/Date applied/), {
      target: { value: "2026-09-29" },
    });
    await user.click(screen.getByRole("button", { name: "Save application" }));

    expect(await screen.findByText("Company is required.")).toBeInTheDocument();
    expect(companyInput).toHaveAttribute("aria-invalid", "true");
    expect(companyInput).toHaveAttribute("aria-describedby", "company-error");
    expect(companyInput).toHaveValue("Entered Co");
  });

  it("edits an application without creating a duplicate", async () => {
    const user = userEvent.setup();
    const current = makeApplication();
    const updated = makeApplication({ role: "Senior Claims Analyst" });
    vi.mocked(api.getApplications)
      .mockResolvedValueOnce([current])
      .mockResolvedValueOnce([updated]);
    vi.mocked(api.updateApplication).mockResolvedValue(updated);
    const { container } = render(<App />);

    await user.click(screen.getByRole("button", { name: "Applications" }));
    await user.click(await screen.findByRole("button", { name: "Edit Claims Analyst at Example Co" }));
    const roleInput = screen.getByLabelText(/^Role/);
    await user.clear(roleInput);
    await user.type(roleInput, updated.role);
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText(updated.role)).toBeInTheDocument();
    expect(api.updateApplication).toHaveBeenCalledWith(
      current.id,
      expect.objectContaining({ role: updated.role }),
      "test-token",
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(container.querySelector(".notice")).toHaveTextContent("Application updated.");
    fireEvent.click(getSectionButton(container, "Insights"));
    expect(container.querySelector(".notice")).toBeNull();
  });

  it("persists status changes", async () => {
    const user = userEvent.setup();
    const application = makeApplication();
    vi.mocked(api.getApplications).mockResolvedValue([application]);
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Applications" }));
    const statusSelect = await screen.findByRole("combobox", { name: "Status" });
    await user.selectOptions(statusSelect, "Interview");

    await waitFor(() => {
      expect(api.updateApplication).toHaveBeenCalledWith(
        application.id,
        { status: "Interview" },
        "test-token",
      );
    });
    expect(statusSelect).toHaveValue("Interview");
  });

  it("combines search and status filters and shows a no-results state", async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole("heading", { name: "Job search dashboard" });
    await user.click(screen.getByRole("button", { name: "Applications" }));
    await user.type(
      screen.getByRole("searchbox", { name: "Search by company or role" }),
      "Analyst",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Filter by status" }),
      "Interview",
    );

    expect(screen.getByRole("button", { name: "Clear search and status filters" })).toBeInTheDocument();
    expect(await screen.findByText("No matches found")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear search and filters" }));
    expect(api.getApplications).toHaveBeenCalledWith("", "");
  });

  it("allows removal cancellation and confirms deletion when accepted", async () => {
    const user = userEvent.setup();
    const application = makeApplication();
    vi.mocked(api.getApplications).mockResolvedValue([application]);
    const confirm = vi.spyOn(window, "confirm");
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Applications" }));
    const removeButton = await screen.findByRole("button", {
      name: "Remove Claims Analyst at Example Co",
    });

    confirm.mockReturnValueOnce(false);
    await user.click(removeButton);
    expect(api.removeApplication).not.toHaveBeenCalled();
    expect(screen.getByText(application.company)).toBeInTheDocument();

    confirm.mockReturnValueOnce(true);
    await user.click(removeButton);
    await waitFor(() => {
      expect(api.removeApplication).toHaveBeenCalledWith(application.id, "test-token");
    });
    expect(await screen.findByText("Your next move starts here")).toBeInTheDocument();
    confirm.mockRestore();
  });
});