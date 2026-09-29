import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "./api";
import App from "./App";

vi.mock("./api", async (importOriginal) => {
  const original = await importOriginal<typeof import("./api")>();
  return {
    ...original,
    createApplication: vi.fn(),
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
    created_at: "2026-09-29T10:00:00+00:00",
    updated_at: "2026-09-29T10:00:00+00:00",
    ...overrides,
  };
}

describe("Application tracker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getCsrfToken).mockResolvedValue({ csrf_token: "test-token" });
    vi.mocked(api.getApplications).mockResolvedValue([]);
    vi.mocked(api.createApplication).mockResolvedValue(makeApplication());
    vi.mocked(api.updateApplication).mockResolvedValue(makeApplication());
    vi.mocked(api.removeApplication).mockResolvedValue(undefined);
  });

  it("shows a useful initial empty state and opens the add form", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByText("Your next move starts here")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add application" }));
    expect(screen.getByRole("heading", { name: "Add an application" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Company/)).toBeRequired();
    expect(screen.getByLabelText(/Role/)).toBeRequired();
  });

  it("creates an application with the Applied default and displays it", async () => {
    const user = userEvent.setup();
    const saved = makeApplication();
    vi.mocked(api.getApplications)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([saved]);
    vi.mocked(api.createApplication).mockResolvedValue(saved);
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Add application" }));
    await user.type(screen.getByLabelText(/Company/), saved.company);
    await user.type(screen.getByLabelText(/Role/), saved.role);
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
  });

  it("shows field-specific server validation and preserves entered values", async () => {
    const user = userEvent.setup();
    vi.mocked(api.createApplication).mockRejectedValue(
      new api.ApiError("Validation failed.", { company: "Company is required." }),
    );
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Add application" }));
    const companyInput = screen.getByLabelText(/Company/);
    await user.type(companyInput, "Entered Co");
    await user.type(screen.getByLabelText(/Role/), "Analyst");
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
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Edit Claims Analyst at Example Co" }));
    const roleInput = screen.getByLabelText(/Role/);
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
  });

  it("persists status changes", async () => {
    const user = userEvent.setup();
    const application = makeApplication();
    vi.mocked(api.getApplications).mockResolvedValue([application]);
    render(<App />);

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

    await screen.findByText("Your next move starts here");
    await user.type(
      screen.getByRole("searchbox", { name: "Search by company or role" }),
      "Analyst",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Filter by status" }),
      "Interview",
    );

    await waitFor(() => {
      expect(api.getApplications).toHaveBeenLastCalledWith("Analyst", "Interview");
    });
    expect(screen.getByRole("button", { name: "Clear search and status filters" })).toBeInTheDocument();
    expect(await screen.findByText("No matches found")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear search and filters" }));
    await waitFor(() => {
      expect(api.getApplications).toHaveBeenLastCalledWith("", "");
    });
  });

  it("allows removal cancellation and confirms deletion when accepted", async () => {
    const user = userEvent.setup();
    const application = makeApplication();
    vi.mocked(api.getApplications).mockResolvedValue([application]);
    const confirm = vi.spyOn(window, "confirm");
    render(<App />);
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