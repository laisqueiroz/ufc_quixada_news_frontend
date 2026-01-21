import React from "react";
import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

import * as AuthCtx from "@/contexts/AuthContext";
const mockUseAuth = vi.spyOn(AuthCtx, "useAuth");
import * as ToastHook from "@/hooks/use-toast";
const mockUseToast = vi.spyOn(ToastHook, "useToast");
import StatusPage from "@/pages/StatusPage";

describe("StatusPage", () => {
  beforeEach(() => vi.resetAllMocks());

  it("renders create form when no solicitation", () => {
    const createSolic = vi.fn().mockResolvedValue({});
    mockUseAuth.mockReturnValue({
      user: { id: 1 },
      isLoading: false,
      mySolicitacao: null,
      createSolicitacao: createSolic,
      refreshSolicitacao: vi.fn(),
    });
    const toastMock = { toast: vi.fn() };
    mockUseToast.mockReturnValue(toastMock);

    render(<StatusPage />, {
      wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
    });
    expect(
      screen.getByRole("combobox", { name: /Tipo de solicitação/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Solicitar/i }),
    ).toBeInTheDocument();
  });

  it("calls createSolicitacao and shows toast on success", async () => {
    const createSolic = vi.fn().mockResolvedValue({});
    const refresh = vi.fn();
    mockUseAuth.mockReturnValue({
      user: { id: 1 },
      isLoading: false,
      mySolicitacao: null,
      createSolicitacao: createSolic,
      refreshSolicitacao: refresh,
    });
    const toastMock = { toast: vi.fn() };
    mockUseToast.mockReturnValue(toastMock);

    render(<StatusPage />, {
      wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
    });

    const btn = screen.getByRole("button", { name: /Solicitar/i });
    await act(async () => {
      await fireEvent.click(btn);
    });

    expect(createSolic).toHaveBeenCalled();
    await waitFor(() => expect(toastMock.toast).toHaveBeenCalled());
  });

  it("shows approved CTA when approved", () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1 },
      isLoading: false,
      mySolicitacao: {
        id: 1,
        usuarioId: 1,
        tipo: "BOLSISTA",
        status: "APROVADA",
        mensagem: null,
        criadoEm: "x",
      },
      createSolicitacao: vi.fn(),
      refreshSolicitacao: vi.fn(),
    });
    render(<StatusPage />, {
      wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
    });
    expect(screen.getByText(/Solicitação aprovada/i)).toBeInTheDocument();
  });
});
