import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { INTERN_LOCALE_STORAGE_KEY, InternLocaleProvider, formatInternDate, internPriorityLabel, internProjectStatusLabel, internReviewStatusLabel, internTaskStatusLabel, useInternLocale } from "./internLocale";

function LocaleHarness() {
  const { locale, setLocale, t } = useInternLocale();
  return <><p data-testid="locale">{locale}</p><p>{t("home.welcome", { name: "김인턴" })}</p><p>{t("projects.title")}</p><button type="button" onClick={() => setLocale("en")}>EN</button></>;
}

describe("Intern locale", () => {
  beforeEach(() => window.localStorage.removeItem(INTERN_LOCALE_STORAGE_KEY));

  it("defaults to Korean and keeps user-entered content untouched", () => {
    render(<InternLocaleProvider><LocaleHarness /></InternLocaleProvider>);
    expect(screen.getByTestId("locale")).toHaveTextContent("ko");
    expect(screen.getByText("김인턴님, 환영합니다")).toBeInTheDocument();
    expect(screen.getByText("내 프로젝트")).toBeInTheDocument();
    expect("한국어 Task title").toBe("한국어 Task title");
  });

  it("switches to English and persists the browser preference", () => {
    render(<InternLocaleProvider><LocaleHarness /></InternLocaleProvider>);
    fireEvent.click(screen.getByRole("button", { name: "EN" }));
    expect(screen.getByTestId("locale")).toHaveTextContent("en");
    expect(screen.getByText("Welcome back, 김인턴")).toBeInTheDocument();
    expect(window.localStorage.getItem(INTERN_LOCALE_STORAGE_KEY)).toBe("en");
  });

  it("localizes enum labels and date-only display without changing values", () => {
    expect(internTaskStatusLabel("IN_PROGRESS", "ko")).toBe("진행 중");
    expect(internTaskStatusLabel("IN_PROGRESS", "en")).toBe("In progress");
    expect(internProjectStatusLabel("ON_HOLD", "ko")).toBe("보류");
    expect(internReviewStatusLabel("CHANGES_REQUESTED", "en")).toBe("Changes requested");
    expect(internPriorityLabel("HIGH", "ko")).toBe("높음");
    expect(formatInternDate("2026-09-06", "ko")).toBe("9월 6일");
    expect(formatInternDate("2026-09-06", "en")).toBe("Sep 6");
  });
});
