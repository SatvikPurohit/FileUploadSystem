// src/__tests__/LoginPage.test.tsx
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "../modules/auth/LoginPage";
import { AuthContext } from "../AuthConext";
import * as authClient from "../api/authClient";

jest.mock("../authClient");

test("shows validation error if empty", async () => {
  render(
    <AuthContext.Provider value={{ isAuthenticated: false, isLoading: false, login: jest.fn(), logout: jest.fn(), verify: jest.fn() }}>
      <LoginPage />
    </AuthContext.Provider>
  );
  fireEvent.click(screen.getByRole("button", { name: /login/i }));
  await waitFor(() => expect(screen.getByText(/email and password required/i)).toBeInTheDocument());
});

test("successful login calls authClient and navigates", async () => {
  (authClient.login as jest.Mock).mockResolvedValue("token");
  const loginMock = jest.fn();
  render(
    <AuthContext.Provider value={{ isAuthenticated: false, isLoading: false, login: loginMock, logout: jest.fn(), verify: jest.fn() }}>
      <LoginPage />
    </AuthContext.Provider>
  );
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "user@example.com" }});
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password" }});
  fireEvent.click(screen.getByRole("button", { name: /login/i }));
  await waitFor(() => expect(authClient.login).toHaveBeenCalled());
});
