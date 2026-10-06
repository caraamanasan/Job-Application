import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ApplicationActivityGrid from "./ApplicationActivityGrid";

describe("ApplicationActivityGrid", () => {
  it("shows exact date/count text and moves keyboard focus by one day", () => {
    const { container } = render(<ApplicationActivityGrid applications={[]} today="2026-10-06" />);

    const formatDate = (date: Date) => new Intl.DateTimeFormat(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(date);
    const lastDate = formatDate(new Date(2026, 9, 6, 12));
    const priorDate = formatDate(new Date(2026, 9, 5, 12));
    const lastDay = container.querySelector(`[role="gridcell"][aria-label="${lastDate}: 0 applications"]`) as HTMLButtonElement;
    fireEvent.mouseEnter(lastDay);
    expect(screen.getByText(`${lastDate} · 0 applications`)).toBeInTheDocument();
    expect(lastDay).not.toHaveFocus();
    lastDay.focus();
    expect(screen.getByText(`${lastDate} · 0 applications`)).toBeInTheDocument();

    fireEvent.keyDown(lastDay, { key: "ArrowLeft" });

    const priorDay = container.querySelector(`[role="gridcell"][aria-label="${priorDate}: 0 applications"]`) as HTMLButtonElement;
    expect(priorDay).toHaveFocus();
    expect(screen.getByText(`${priorDate} · 0 applications`)).toBeInTheDocument();
  }, 15000);

  it("provides a clear no-activity state while retaining zero-count dates", () => {
    const { container } = render(<ApplicationActivityGrid applications={[]} today="2026-10-06" />);

    expect(screen.getByText("No applications recorded in this period")).toBeInTheDocument();
    expect(container.querySelectorAll('[role="gridcell"]')).toHaveLength(366);
  });
});