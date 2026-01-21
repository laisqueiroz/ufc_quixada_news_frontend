import React from "react";
import { render, screen, within, waitFor } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("@/lib/api", () => ({
  api: { getSolicitacoes: vi.fn(), getSolicitacoesPendentes: vi.fn() },
}));

import * as AuthCtx from "@/contexts/AuthContext";
const mockUseAuth = vi.spyOn(AuthCtx, "useAuth");

import SolicitacoesPage from "@/pages/dashboard/SolicitacoesPage";
import { api } from "@/lib/api";

describe("SolicitacoesPage — DOM structure & accessibility", () => {
  beforeEach(() => vi.resetAllMocks());

  it("renders table header with proper columnheader roles (no invalid nesting)", async () => {
    mockUseAuth.mockReturnValue({ isAdmin: true } as any);
    (api.getSolicitacoesPendentes as any).mockResolvedValueOnce([
      {
        id: 1,
        usuarioId: 2,
        usuarioNome: "Zé",
        tipo: "BOLSISTA",
        status: "PENDENTE",
        mensagem: null,
        criadoEm: "x",
      },
    ]);

    render(<SolicitacoesPage />);

    // header cells should be exposed as columnheader
    const headers = await screen.findAllByRole("columnheader");
    expect(headers.length).toBeGreaterThanOrEqual(4);
    expect(within(headers[0]).getByText(/Usuário/i)).toBeInTheDocument();

    // ensure the user's name and id are visible in the first row
    expect(await screen.findByText(/Zé/)).toBeInTheDocument();
    expect(screen.getByText(/#2/)).toBeInTheDocument();

    // title/subtitle follow ArticlesList pattern
    expect(
      screen.getByRole("heading", { name: /Solicitações/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Lista de solicitações pendentes/),
    ).toBeInTheDocument();
  });

  it("uses the same table container classes as ArticlesList for responsive behaviour", async () => {
    mockUseAuth.mockReturnValue({ isAdmin: true } as any);
    (api.getSolicitacoesPendentes as any).mockResolvedValueOnce([]);

    const { container } = render(<SolicitacoesPage />);
    // ensure the outer table wrapper has the same structural classes used in ArticlesList
    const wrapper = container.querySelector(".rounded-lg.border.bg-card");
    expect(wrapper).not.toBeNull();
  });

  it("truncates long mensagem cells (responsive) via class", async () => {
    mockUseAuth.mockReturnValue({ isAdmin: true } as any);
    (api.getSolicitacoesPendentes as any).mockResolvedValueOnce([
      {
        id: 2,
        usuarioId: 3,
        tipo: "PROFESSOR",
        status: "PENDENTE",
        mensagem: "a".repeat(400),
        criadoEm: "x",
      },
    ]);

    const { container } = render(<SolicitacoesPage />);
    const cell = await screen.findByText((content, node) =>
      node?.classList?.contains("truncate"),
    );
    expect(cell).toBeInTheDocument();
    // ensure we have a max-width utility applied for responsive truncation
    const hasMaxW = Array.from(cell.classList).some((c) =>
      c.startsWith("max-w-"),
    );
    expect(hasMaxW).toBe(true);
  });
});
