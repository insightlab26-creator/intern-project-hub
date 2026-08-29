import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthContext } from "../../app/providers/authContext";
import V2LoginPage from "./V2LoginPage";

function renderPage(signInCurrentUser = vi.fn().mockResolvedValue({})) {
  render(<AuthContext.Provider value={{ profile: null, isLoading: false, signInCurrentUser, signOutCurrentUser: vi.fn() }}><V2LoginPage /></AuthContext.Provider>);
  return signInCurrentUser;
}

describe("V2LoginPage", () => {
  it("submits the existing email and password auth contract", async () => {
    const signInCurrentUser = renderPage();
    expect(screen.getByText("Intern Program", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("Intern Project Hub · V2")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "intern@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(signInCurrentUser).toHaveBeenCalledWith("intern@example.com", "password");
  });

  it("shows a compact mapped error without exposing the auth error", async () => {
    renderPage(vi.fn().mockRejectedValue(new Error("invalid credentials from Supabase")));
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "intern@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to sign in. Check your email and password.");
    expect(screen.queryByText("invalid credentials from Supabase")).not.toBeInTheDocument();
  });

  it("disables duplicate submission while signing in and exposes only implemented actions", () => {
    const signInCurrentUser = vi.fn().mockReturnValue(new Promise(() => undefined));
    renderPage(signInCurrentUser);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "intern@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByRole("button", { name: "Signing in…" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /sign up|forgot|google|microsoft|sso/i })).not.toBeInTheDocument();
  });
});
