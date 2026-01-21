import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

// mock api used by AuthProvider in some integration-like tests
vi.mock("@/lib/api", () => ({
  api: { getProfile: vi.fn(), getSolicitacoes: vi.fn() },
}));

// In tests we don't need Radix's dropdown behavior — render menu content inline so
// assertions don't depend on open/close timing. This keeps tests fast and stable.
vi.mock("@/components/ui/dropdown-menu", () => {
  const React = require("react");
  return {
    DropdownMenu: ({ children }: any) =>
      React.createElement(React.Fragment, null, children),
    // preserve the trigger's child (avoid wrapping a real <button> inside another <button>)
    DropdownMenuTrigger: ({ children }: any) => React.Children.only(children),
    DropdownMenuContent: ({ children }: any) =>
      React.createElement("div", null, children),
    DropdownMenuItem: ({ children, ...props }: any) =>
      React.createElement("div", props, children),
    DropdownMenuSeparator: ({ children }: any) =>
      React.createElement("div", null, children),
  };
});

import * as Auth from "@/contexts/AuthContext";
const mockUseAuth = vi.spyOn(Auth, "useAuth");

import { Header } from "@/components/layout/Header";
import { api } from "@/lib/api";

describe("Header (profile menu)", () => {
  beforeEach(() => vi.resetAllMocks());

  it('shows "Visualizar solicitação" when user has PENDENTE solicitation', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, nome: "Ana Silva", email: "a@a" },
      isAuthenticated: true,
      canPublish: false,
      isApproved: false,
      mySolicitacao: {
        id: 5,
        usuarioId: 1,
        tipo: "BOLSISTA",
        status: "PENDENTE",
        mensagem: null,
        criadoEm: "x",
      },
      logout: vi.fn(),
    });

    render(<Header />, {
      wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
    });

    // open profile menu (use role query to target the button reliably)
    const trigger = screen.getByRole("button", { name: /Ana/i });
    await fireEvent.click(trigger);

    expect(
      await screen.findByText(/Visualizar solicitação/i),
    ).toBeInTheDocument();
    expect(
      (await screen.findByText(/Visualizar solicitação/i)).closest("a"),
    ).toHaveAttribute("href", "/status");
  });

  it('shows "Visualizar solicitação" when user has REJEITADA solicitation', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 2, nome: "Bruno", email: "b@b" },
      isAuthenticated: true,
      canPublish: false,
      isApproved: false,
      mySolicitacao: {
        id: 6,
        usuarioId: 2,
        tipo: "BOLSISTA",
        status: "REJEITADA",
        mensagem: null,
        criadoEm: "x",
      },
      logout: vi.fn(),
    });

    render(<Header />, {
      wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
    });
    const trigger = screen.getByRole("button", { name: /Bruno/i });
    await fireEvent.click(trigger);

    expect(
      await screen.findByText(/Visualizar solicitação/i),
    ).toBeInTheDocument();
  });

  it("shows Dashboard when user is approved", async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 3, nome: "Carlos", email: "c@c" },
      isAuthenticated: true,
      canPublish: true,
      isApproved: true,
      mySolicitacao: {
        id: 7,
        usuarioId: 3,
        tipo: "PROFESSOR",
        status: "APROVADA",
        mensagem: null,
        criadoEm: "x",
      },
      logout: vi.fn(),
    });

    render(<Header />, {
      wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
    });
    const trigger = screen.getByRole("button", { name: /Carlos/i });
    await fireEvent.click(trigger);

    expect(
      await screen.findByRole("link", { name: /Dashboard/i }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText(/Visualizar solicitação/i)).toBeNull(),
    );
  });

  it("shows Dashboard when solicitation is APROVADA but user.papel not yet updated (transient)", async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 8, nome: "Ana", email: "a@a", papel: "VISITANTE" },
      isAuthenticated: true,
      canPublish: false,
      isApproved: true,
      mySolicitacao: {
        id: 20,
        usuarioId: 8,
        tipo: "BOLSISTA",
        status: "APROVADA",
        mensagem: null,
        criadoEm: "x",
      },
      logout: vi.fn(),
    });

    render(<Header />, {
      wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
    });
    const trigger = screen.getByRole("button", { name: /Ana/i });
    await fireEvent.click(trigger);

    expect(
      await screen.findByRole("link", { name: /Dashboard/i }),
    ).toBeInTheDocument();
  });

  it("does not show Visualizar solicitação when no solicitation exists", async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 4, nome: "Dora", email: "d@d" },
      isAuthenticated: true,
      canPublish: false,
      isApproved: false,
      mySolicitacao: null,
      logout: vi.fn(),
    });

    render(<Header />, {
      wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
    });
    const trigger = screen.getByRole("button", { name: /Dora/i });
    await fireEvent.click(trigger);

    expect(
      screen.queryByRole("link", { name: /Visualizar solicitação/i }),
    ).toBeNull();
    expect(screen.queryByRole("link", { name: /Dashboard/i })).toBeNull();
  });

  it('shows "Visualizar solicitação" for a VISITANTE profile with a pending solicitation (real scenario)', async () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 7,
        nome: "Teste Professor",
        email: "professor@ufc.br",
        papel: "VISITANTE",
      },
      isAuthenticated: true,
      canPublish: false,
      isApproved: false,
      mySolicitacao: {
        id: 2,
        usuarioId: 7,
        tipo: "PROFESSOR",
        status: "PENDENTE",
        mensagem: null,
        criadoEm: "2026-01-20T17:35:48.107Z",
      },
      logout: vi.fn(),
    });

    render(<Header />, {
      wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
    });
    const trigger = screen.getByRole("button", { name: /Teste/i });
    await fireEvent.pointerDown(trigger);

    expect(
      await screen.findByText(/Visualizar solicitação/i),
    ).toBeInTheDocument();
    expect(
      (await screen.findByText(/Visualizar solicitação/i)).closest("a"),
    ).toHaveAttribute("href", "/status");
  });
  it("loads solicitation when profile menu is opened (handles delayed API)", async () => {
    // simulate an authenticated session with delayed solicitacoes response
    localStorage.setItem("auth_token", "token-123");
    (api.getProfile as any).mockResolvedValue({
      id: 7,
      nome: "Teste Professor",
      email: "professor@ufc.br",
      papel: "VISITANTE",
    });

    let resolveSolics: any;
    (api.getSolicitacoes as any).mockImplementation(
      () =>
        new Promise((res) => {
          resolveSolics = res;
        }),
    );
    render(<Header />, {
      wrapper: ({ children }) => (
        <MemoryRouter>
          <Auth.AuthProvider>{children}</Auth.AuthProvider>
        </MemoryRouter>
      ),
    });
    // wait for profile to be loaded
    await screen.findByRole("button", { name: /Teste/i });

    const trigger = screen.getByRole("button", { name: /Teste/i });
    await fireEvent.pointerDown(trigger);

    // loadUser (not the Header) should have initiated solicitacoes fetch already
    await waitFor(() => expect(api.getSolicitacoes).toHaveBeenCalled());

    // opening the menu SHOULD NOT trigger another solicitacoes fetch (per spec)
    api.getSolicitacoes.mockClear();
    // don't re-toggle the trigger (that closes the Radix menu) — ensure no further calls occur
    await Promise.resolve();
    expect(api.getSolicitacoes).not.toHaveBeenCalled();

    // resolve the delayed response (user has a pending solicitation)
    act(() =>
      resolveSolics([
        {
          id: 2,
          usuarioId: 7,
          tipo: "PROFESSOR",
          status: "PENDENTE",
          mensagem: null,
          criadoEm: "2026-01-20T17:35:48.107Z",
        },
      ]),
    );

    // the menu should update and show the link (after the pending request resolves)
    expect(
      await screen.findByRole("link", { name: /Visualizar solicitação/i }),
    ).toBeInTheDocument();
  });
});
