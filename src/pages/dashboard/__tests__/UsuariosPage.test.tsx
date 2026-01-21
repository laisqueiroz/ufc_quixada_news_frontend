import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
  within,
} from "@testing-library/react";
import { vi } from "vitest";

vi.mock("@/lib/api", () => ({
  api: { getUsers: vi.fn(), createUserAdmin: vi.fn(), updateUserRole: vi.fn() },
}));

import * as AuthCtx from "@/contexts/AuthContext";
const mockUseAuth = vi.spyOn(AuthCtx, "useAuth");

import UsuariosPage from "@/pages/dashboard/UsuariosPage";
import { api } from "@/lib/api";

describe("UsuariosPage (admin)", () => {
  beforeEach(() => vi.resetAllMocks());

  it("lists users and does not show sensitive fields", async () => {
    mockUseAuth.mockReturnValue({ isAdmin: true } as any);
    (api.getUsers as any).mockResolvedValueOnce([
      {
        id: 1,
        nome: "A",
        login: "a",
        email: "a@a",
        papel: "VISITANTE",
        criadoEm: "x",
      },
    ]);

    const { container } = render(<UsuariosPage />);

    // find the app table and assert the user row is rendered (avoid matching option labels)
    const table = container.querySelector("table");
    expect(table).toBeTruthy();
    expect(table && (await within(table).findByText("A"))).toBeTruthy();

    // password must not be present anywhere in the rendered app
    expect(screen.queryByText(/senha/i)).toBeNull();
  });

  it("creates a user via admin API", async () => {
    mockUseAuth.mockReturnValue({ isAdmin: true } as any);
    (api.getUsers as any)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: 2, nome: "B", login: "b", email: "b@b", papel: "ESTUDANTE" },
      ]);
    (api.createUserAdmin as any).mockResolvedValue({ id: 2 });

    render(<UsuariosPage />);

    const trigger = screen.getByRole("button", { name: /Novo usuário/i });
    await act(async () => trigger.click());

    const nome = screen.getAllByPlaceholderText(/Nome/)[0];
    const login = screen.getAllByPlaceholderText(/Login/)[0];
    const email = screen.getAllByPlaceholderText(/Email/)[0];

    await act(async () => {
      fireEvent.change(nome, { target: { value: "B" } });
      fireEvent.change(login, { target: { value: "b" } });
      fireEvent.change(email, { target: { value: "b@b" } });
    });

    const createBtn = screen.getByRole("button", { name: /Criar/i });
    await act(async () => createBtn.click());

    await waitFor(() =>
      expect(api.createUserAdmin).toHaveBeenCalledWith(
        expect.objectContaining({ nome: "B", login: "b", email: "b@b" }),
      ),
    );
    // ensure we refreshed the list after creation
    await waitFor(() => expect(api.getUsers).toHaveBeenCalledTimes(2));
  });

  it("changes user role", async () => {
    mockUseAuth.mockReturnValue({ isAdmin: true } as any);
    (api.getUsers as any).mockResolvedValueOnce([
      { id: 3, nome: "C", login: "c", email: "c@c", papel: "VISITANTE" },
    ]);
    // make updateUserRole return a deferred promise so we can assert the in-flight UI
    let resolveUpdate: () => void;
    const updatePromise = new Promise<void>((res) => (resolveUpdate = res));
    (api.updateUserRole as any).mockImplementation(() => updatePromise);

    render(<UsuariosPage />);

    // edit flow: Select is hidden until 'Editar' is clicked
    expect(screen.queryByRole("button", { name: /Editar/i })).toBeNull();

    // find the row by the user's name cell (more robust than relying on role semantics)
    const nameCell = await screen.findByText("C");
    const row = nameCell.closest("tr")!;
    const editBtn = within(row).getByRole("button", { name: /Editar/i });
    await act(async () => editBtn.click());

    // now Save should be visible and clicking it triggers the API
    const save = within(row).getByRole("button", { name: /Salvar/i });

    // click Save and assert it's disabled while the request is in-flight
    await act(async () => save.click());
    await waitFor(() =>
      expect(
        within(row).getByRole("button", { name: /Salvar/i }),
      ).toBeDisabled(),
    );

    // resolve the mocked API and assert it was called
    await act(async () => resolveUpdate());
    await waitFor(() =>
      expect(api.updateUserRole).toHaveBeenCalledWith(3, expect.any(String)),
    );

    // after resolution the Save button should no longer be present (editor closed)
    await waitFor(() =>
      expect(within(row).queryByRole("button", { name: /Salvar/i })).toBeNull(),
    );
  });
});
