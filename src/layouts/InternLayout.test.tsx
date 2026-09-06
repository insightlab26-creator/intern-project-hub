import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AuthContext } from "../app/providers/authContext";
import InternLayout from "./InternLayout";

describe("InternLayout", () => {
  it("shows My Tasks and hides unsupported gamification navigation", () => {
    render(<MemoryRouter><AuthContext.Provider value={{ profile: { id: "intern", email: null, display_name: "Intern", global_role: "INTERN", status: "ACTIVE" }, isLoading: false, signInCurrentUser: async () => { throw new Error("not used"); }, signOutCurrentUser: async () => {} }}><InternLayout /></AuthContext.Provider></MemoryRouter>);
    expect(screen.getByRole("link", { name: "My Tasks" })).toHaveAttribute("href", "/intern/tasks");
    expect(screen.queryByText("Achievements")).not.toBeInTheDocument();
    expect(screen.queryByText("Ranking")).not.toBeInTheDocument();
  });
});
