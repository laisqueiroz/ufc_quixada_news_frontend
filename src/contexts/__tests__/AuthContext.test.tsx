import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("@/lib/api", () => {
  return {
    api: {
      getProfile: vi.fn(),
      login: vi.fn(),
      getSolicitacoes: vi.fn(),
      createSolicitacao: vi.fn(),
    },
  };
});

import { api } from "@/lib/api";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

describe("AuthContext", () => {
  beforeEach(() => vi.resetAllMocks());

  it("computes isApproved from solicitacao", async () => {
    // Simulate an authenticated session so loadUser runs automatically.
    localStorage.setItem("auth_token", "test-token");

    (api.getProfile as any).mockResolvedValue({
      id: 1,
      nome: "A",
      login: "a",
      email: "a@a",
      papel: "ESTUDANTE",
    });

    (api.getSolicitacoes as any).mockResolvedValue([
      {
        id: 10,
        usuarioId: 1,
        tipo: "BOLSISTA",
        status: "APROVADA",
        mensagem: null,
        criadoEm: "x",
      },
    ]);

    const wrapper: any = ({ children }: any) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    // loadUser should run (because token exists) and then refreshSolicitacao
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await waitFor(() => expect(api.getSolicitacoes).toHaveBeenCalled());
    await waitFor(() => expect(result.current.mySolicitacao).not.toBeNull());
    expect(result.current.isApproved).toBe(true);

    localStorage.removeItem("auth_token");
  });

  it('treats legacy/DB status "ACEITA" as approved', async () => {
    localStorage.setItem("auth_token", "aceita-token");
    (api.getProfile as any).mockResolvedValue({
      id: 2,
      nome: "B",
      login: "b",
      email: "b@b",
      papel: "VISITANTE",
    });
    (api.getSolicitacoes as any).mockResolvedValue([
      {
        id: 11,
        usuarioId: 2,
        tipo: "PROFESSOR",
        status: "ACEITA",
        criadoEm: "x",
      },
    ]);

    const wrapper: any = ({ children }: any) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await waitFor(() => expect(result.current.mySolicitacao).not.toBeNull());
    expect(result.current.isApproved).toBe(true);
    localStorage.removeItem("auth_token");
  });

  it("respects backend-provided profile.isApproved when present", async () => {
    localStorage.setItem("auth_token", "profile-flag");
    (api.getProfile as any).mockResolvedValue({
      id: 3,
      nome: "C",
      login: "c",
      email: "c@c",
      papel: "VISITANTE",
      isApproved: true,
    });
    (api.getSolicitacoes as any).mockResolvedValue([]);

    const wrapper: any = ({ children }: any) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isApproved).toBe(true);
    localStorage.removeItem("auth_token");
  });

  it("loadUser fetches solicitacoes immediately after profile is loaded (regression)", async () => {
    // ensure the loadUser path (not login) fetches solicitacoes for the loaded profile
    localStorage.setItem("auth_token", "token-loaduser");

    (api.getProfile as any).mockResolvedValue({
      id: 42,
      nome: "Laila",
      login: "l",
      email: "l@l",
      papel: "VISITANTE",
    });

    let resolveSolics: any;
    (api.getSolicitacoes as any).mockImplementation(
      () =>
        new Promise((res) => {
          resolveSolics = res;
        }),
    );

    const wrapper: any = ({ children }: any) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });

    // wait for profile to finish loading
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // loadUser should have attempted to fetch solicitacoes (even if delayed)
    await waitFor(() => expect(api.getSolicitacoes).toHaveBeenCalled());

    // deliver response: the user's solicitation is pending
    act(() =>
      resolveSolics([
        {
          id: 99,
          usuarioId: 42,
          tipo: "PROFESSOR",
          status: "PENDENTE",
          mensagem: null,
          criadoEm: "x",
        },
      ]),
    );

    await waitFor(() => expect(result.current.mySolicitacao).not.toBeNull());
    expect(result.current.mySolicitacao?.status).toBe("PENDENTE");

    localStorage.removeItem("auth_token");
  });

  it("refreshSolicitacao tolerates API response shapes (data[] / solicitacoes[] / invalid)", async () => {
    const wrapper: any = ({ children }: any) => (
      <AuthProvider>{children}</AuthProvider>
    );

    // 1) { data: [...] } -> use login path then refreshSolicitacao()
    (api.login as any).mockResolvedValue({
      token: "t",
      user: { id: 5, nome: "X", login: "x", email: "x@x", papel: "VISITANTE" },
    });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.login("x", "p");
    });

    (api.getSolicitacoes as any).mockResolvedValueOnce({
      data: [
        {
          id: 55,
          usuarioId: 5,
          tipo: "BOLSISTA",
          status: "PENDENTE",
          mensagem: null,
          criadoEm: "x",
        },
      ],
    });
    await result.current.refreshSolicitacao();
    await waitFor(() =>
      expect(result.current.mySolicitacao?.usuarioId).toBe(5),
    );
    api.getSolicitacoes.mockClear();

    // 2) { solicitacoes: [...] }
    localStorage.setItem("auth_token", "t2");
    (api.getProfile as any).mockResolvedValue({
      id: 6,
      nome: "Y",
      login: "y",
      email: "y@y",
      papel: "VISITANTE",
    });
    (api.login as any).mockResolvedValue({
      token: "t2",
      user: { id: 6, nome: "Y", login: "y", email: "y@y", papel: "VISITANTE" },
    });
    const { result: result2 } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result2.current.login("y", "p");
    });

    (api.getSolicitacoes as any).mockResolvedValueOnce({
      solicitacoes: [
        {
          id: 66,
          usuarioId: 6,
          tipo: "PROFESSOR",
          status: "REJEITADA",
          mensagem: null,
          criadoEm: "x",
        },
      ],
    });
    await result2.current.refreshSolicitacao();
    await waitFor(() =>
      expect(result2.current.mySolicitacao?.usuarioId).toBe(6),
    );
    api.getSolicitacoes.mockClear();
    localStorage.removeItem("auth_token");

    // 3) invalid shape -> no throw, mySolicitacao remains null
    localStorage.setItem("auth_token", "t3");
    (api.getProfile as any).mockResolvedValue({
      id: 7,
      nome: "Z",
      login: "z",
      email: "z@z",
      papel: "VISITANTE",
    });
    const { result: result3 } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result3.current.isLoading).toBe(false));
    (api.getSolicitacoes as any).mockResolvedValueOnce({ ok: true });
    await result3.current.refreshSolicitacao();
    expect(result3.current.mySolicitacao).toBeNull();
    localStorage.removeItem("auth_token");
  });

  it("createSolicitacao calls api and refreshes", async () => {
    (api.getProfile as any).mockResolvedValue({
      id: 2,
      nome: "B",
      login: "b",
      email: "b@b",
      papel: "ESTUDANTE",
    });
    (api.getSolicitacoes as any).mockResolvedValue([]);
    (api.createSolicitacao as any).mockResolvedValue({
      id: 11,
      usuarioId: 2,
      tipo: "BOLSISTA",
      status: "PENDENTE",
      mensagem: "ok",
      criadoEm: "x",
    });

    const wrapper: any = ({ children }: any) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      const s = await result.current.createSolicitacao("BOLSISTA", "teste");
      expect(s).toHaveProperty("id");
    });

    expect(api.createSolicitacao).toHaveBeenCalledWith("BOLSISTA", "teste");
  });
});
