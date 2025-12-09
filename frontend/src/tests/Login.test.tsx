import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../tests/test-utils";
import LoginPage from "../modules/auth/LoginPage"; // adjust path if your test folder layout differs
import { AuthContext } from "../AuthConext"; // keep same path as your app (you used this in the component)
import * as authClient from "../api/authClient";

jest.mock("../api/authClient");

test("shows validation error when fields empty (component shows last-set error)", async () => {
  renderWithProviders(
    <AuthContext.Provider
      value={{
        isAuthenticated: false,
        isLoading: false,
        login: jest.fn(),
        logout: jest.fn(),
      }}
    >
      <LoginPage />
    </AuthContext.Provider>
  );

  fireEvent.click(screen.getByRole("button", { name: /login/i }));

  const matches = await screen.findAllByText(/Password required/i);
  expect(matches.length).toBeGreaterThan(0);
});

test("successful login calls authClient and auth.login", async () => {
  (authClient.login as jest.Mock).mockResolvedValue("token");
  const loginMock = jest.fn();

  renderWithProviders(
    <AuthContext.Provider
      value={{
        isAuthenticated: false,
        isLoading: false,
        login: loginMock,
        logout: jest.fn(),
      }}
    >
      <LoginPage />
    </AuthContext.Provider>
  );

  fireEvent.change(screen.getByLabelText(/email/i), {
    target: { value: "user@example.com" },
  });
  fireEvent.change(screen.getByLabelText(/password/i), {
    target: { value: "password" },
  });

  fireEvent.click(screen.getByRole("button", { name: /login/i }));

  await waitFor(() =>
    expect(authClient.login).toHaveBeenCalledWith(
      "user@example.com",
      "password"
    )
  );
  // ensure auth.login was called
  expect(loginMock).toHaveBeenCalled();
});
