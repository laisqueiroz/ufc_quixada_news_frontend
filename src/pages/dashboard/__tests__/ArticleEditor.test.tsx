import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ArticleEditor from "../ArticleEditor";

import * as ApiModule from "../../../lib/api";

// mock useToast to avoid needing provider
vi.mock("../../../hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe("ArticleEditor slug visual feedback", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('shows green border and "disponível" when slug is available', async () => {
    vi.spyOn(ApiModule.api, "checkSlugAvailability").mockResolvedValue(true);

    render(
      <MemoryRouter>
        <ArticleEditor />
      </MemoryRouter>,
    );

    const input = screen.getByPlaceholderText("slug-para-url (opcional)");
    fireEvent.change(input, { target: { value: "meu-slug" } });

    const checkBtn = screen.getByRole("button", { name: /verificar/i });
    fireEvent.click(checkBtn);

    await waitFor(() => {
      expect(screen.getByText(/disponível/i)).toBeInTheDocument();
    });

    // the className should include green border
    expect(input.className).toMatch(/border-?green-600/);
  });

  test('shows red border and "indisponível" when slug is not available', async () => {
    vi.spyOn(ApiModule.api, "checkSlugAvailability").mockResolvedValue(false);

    render(
      <MemoryRouter>
        <ArticleEditor />
      </MemoryRouter>,
    );

    const input = screen.getByPlaceholderText("slug-para-url (opcional)");
    fireEvent.change(input, { target: { value: "meu-slug" } });

    const checkBtn = screen.getByRole("button", { name: /verificar/i });
    fireEvent.click(checkBtn);

    await waitFor(() => {
      expect(screen.getByText(/indisponível/i)).toBeInTheDocument();
    });

    // the className should include red border
    expect(input.className).toMatch(/border-?red-600/);
  });
});

describe("ArticleEditor action buttons (create vs edit)", () => {
  beforeEach(() => vi.resetAllMocks());

  test('creation: shows Publish (left), "Salvar como Rascunho" and "Salvar Rascunho e Pré Visualizar"', async () => {
    render(
      <MemoryRouter>
        <ArticleEditor />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("button", { name: /Publicar/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Salvar como Rascunho/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Salvar Rascunho e Pré Visualizar/i }),
    ).toBeInTheDocument();

    // ensure order: Publish appears before Save-as-draft
    const buttons = screen.getAllByRole("button");
    const idxPublish = buttons.findIndex((b) =>
      /Publicar/i.test(b.textContent || ""),
    );
    const idxSaveAs = buttons.findIndex((b) =>
      /Salvar como Rascunho/i.test(b.textContent || ""),
    );
    expect(idxPublish).toBeLessThan(idxSaveAs);
  });

  test('editing (draft): shows Publish and no separate "Salvar como Rascunho" button', async () => {
    // render the editor as an editing route so useParams() returns id
    vi.spyOn(ApiModule.api, "getManageArticle").mockResolvedValue({
      id: 1,
      titulo: "x",
      slug: "x",
      sessoes: [],
      categoria: "OUTROS",
      publicado: false,
    });

    render(
      <MemoryRouter initialEntries={["/dashboard/artigos/1/editar"]}>
        <Routes>
          <Route
            path="/dashboard/artigos/:id/editar"
            element={<ArticleEditor />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("button", { name: /Publicar/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Salvar como Rascunho/i }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: /Pré-visualizar/i }),
    ).toBeInTheDocument();
  });

  test('editing (published): shows "Ocultar" and no separate save-draft button', async () => {
    vi.spyOn(ApiModule.api, "getManageArticle").mockResolvedValue({
      id: 2,
      titulo: "y",
      slug: "y",
      sessoes: [],
      categoria: "OUTROS",
      publicado: true,
    });

    render(
      <MemoryRouter initialEntries={["/dashboard/artigos/2/editar"]}>
        <Routes>
          <Route
            path="/dashboard/artigos/:id/editar"
            element={<ArticleEditor />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("button", { name: /Ocultar/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Salvar como Rascunho/i }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: /Pré-visualizar/i }),
    ).toBeInTheDocument();
  });
});
