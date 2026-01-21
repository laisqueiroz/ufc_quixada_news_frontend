import React from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("@/lib/api", () => ({
  api: {
    getSolicitacoes: vi.fn(),
    getSolicitacoesPendentes: vi.fn(),
    aceitarSolicitacao: vi.fn(),
    rejeitarSolicitacao: vi.fn(),
  },
}));

import * as AuthCtx from "@/contexts/AuthContext";
const mockUseAuth = vi.spyOn(AuthCtx, "useAuth");

import SolicitacoesPage from "@/pages/dashboard/SolicitacoesPage";
import { api } from "@/lib/api";

describe("SolicitacoesPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("shows action buttons for admin", async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1 },
      isAdmin: true,
      isProfessor: false,
      isTecnico: false,
    });
    (api.getSolicitacoesPendentes as any).mockResolvedValue([
      {
        id: 1,
        usuarioId: 2,
        usuarioNome: "Fulano",
        tipo: "BOLSISTA",
        status: "PENDENTE",
        mensagem: null,
        criadoEm: "x",
      },
    ]);

    render(<SolicitacoesPage />);

    expect(await screen.findByText(/Fulano/)).toBeInTheDocument();
    expect(screen.getByText(/#2/)).toBeInTheDocument();
    expect(await screen.findByText(/Aceitar/i)).toBeInTheDocument();
    expect(screen.getByText(/Rejeitar/i)).toBeInTheDocument();
  });

  it("shows action buttons for tecnico on BOLSISTA requests", async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1 },
      isAdmin: false,
      isProfessor: false,
      isTecnico: true,
    });
    (api.getSolicitacoesPendentes as any).mockResolvedValue([
      {
        id: 1,
        usuarioId: 2,
        usuarioNome: "Beltrano",
        tipo: "BOLSISTA",
        status: "PENDENTE",
        mensagem: null,
        criadoEm: "x",
      },
    ]);

    render(<SolicitacoesPage />);

    expect(await screen.findByText(/Beltrano/)).toBeInTheDocument();
    expect(screen.getByText(/#2/)).toBeInTheDocument();
    expect(await screen.findByText(/Aceitar/i)).toBeInTheDocument();
    expect(screen.getByText(/Rejeitar/i)).toBeInTheDocument();
  });

  it("accepts a solicitation and shows toast", async () => {
    const toastMock = { toast: vi.fn() };
    const ToastHook = await import("@/hooks/use-toast");
    vi.spyOn(ToastHook, "useToast").mockReturnValue(toastMock as any);
    mockUseAuth.mockReturnValue({
      user: { id: 1 },
      isAdmin: true,
      isProfessor: false,
      isTecnico: false,
    });
    (api.getSolicitacoesPendentes as any)
      .mockResolvedValueOnce([
        {
          id: 2,
          usuarioId: 3,
          usuarioNome: "Ciclano",
          tipo: "BOLSISTA",
          status: "PENDENTE",
          mensagem: null,
          criadoEm: "x",
        },
      ])
      .mockResolvedValueOnce([]);
    (api.aceitarSolicitacao as any).mockResolvedValue(undefined);

    render(<SolicitacoesPage />);

    const btn = await screen.findByText(/Aceitar/i);
    // visual: accept button should use the success variant (green background)
    const btnEl = btn.closest("button") as HTMLButtonElement;
    expect(btnEl).toBeTruthy();
    expect(
      Array.from(btnEl.classList).some((c) => c.startsWith("bg-success")),
    ).toBe(true);

    await act(async () => btn.click());

    expect(api.aceitarSolicitacao).toHaveBeenCalledWith(2);
    await waitFor(() => expect(toastMock.toast).toHaveBeenCalled());
  });
});
