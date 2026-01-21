import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";

import * as Auth from "@/contexts/AuthContext";
const mockUseAuth = vi.spyOn(Auth, "useAuth");

import DashboardLayout from "@/pages/dashboard/DashboardLayout";

describe("DashboardLayout (access guards)", () => {
  afterEach(() => vi.resetAllMocks());

  it("does not redirect admin during initial profile load (reload case)", async () => {
    // simulate loading -> then admin user
    mockUseAuth.mockReturnValueOnce({ isLoading: true } as any);
    mockUseAuth.mockReturnValueOnce({
      isLoading: false,
      isAdmin: true,
      isApproved: true,
      user: { nome: "Admin" },
    } as any);

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<div>Dashboard Home</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    // admin should be able to see Dashboard content after load
    await waitFor(() =>
      expect(screen.queryByText(/Dashboard Home/i)).toBeInTheDocument(),
    );
  });

  it("redirects non-approved user to /status only after profile finished loading", async () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAdmin: false,
      isApproved: false,
      canPublish: false,
    } as any);

    const navSpy = vi.fn();
    // render the layout route and ensure it doesn't render the Dashboard outlet
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<div>Dashboard Home</div>} />
          </Route>
          <Route path="/status" element={<div>Status Page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(screen.queryByText(/Dashboard Home/i)).not.toBeInTheDocument(),
    );
    // non-approved users must be redirected to /status
    await waitFor(() =>
      expect(screen.queryByText(/Status Page/i)).toBeInTheDocument(),
    );
  });

  it("allows access when user has publishing privileges even if not approved", async () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAdmin: false,
      isApproved: false,
      canPublish: true,
    } as any);

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<div>Dashboard Home</div>} />
          </Route>
          <Route path="/status" element={<div>Status Page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(screen.queryByText(/Dashboard Home/i)).toBeInTheDocument(),
    );
  });

  it("shows 'Solicitações' in the sidebar for Professor", async () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAdmin: false,
      isApproved: true,
      isProfessor: true,
      user: { nome: "Prof" },
    } as any);

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<div>Dashboard Home</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Solicitações/i)).toBeInTheDocument();
  });

  it("shows 'Solicitações' in the sidebar for Técnico Administrativo", async () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAdmin: false,
      isApproved: true,
      isTecnico: true,
      user: { nome: "Técnico" },
    } as any);

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<div>Dashboard Home</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Solicitações/i)).toBeInTheDocument();
  });
});
