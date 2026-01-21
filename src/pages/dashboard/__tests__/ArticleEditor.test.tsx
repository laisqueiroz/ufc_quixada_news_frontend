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

  test('editing (draft): shows Publish, right-side Save and no separate "Salvar como Rascunho" button', async () => {
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

    // new: explicit Save button on the right
    const saveBtn = screen.getByRole("button", { name: /^Salvar$/i });
    expect(saveBtn).toBeInTheDocument();
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

    // Save should be present when editing published article as well
    expect(
      screen.getByRole("button", { name: /^Salvar$/i }),
    ).toBeInTheDocument();
  });

  test("editing: Save persists edits without changing published state", async () => {
    vi.spyOn(ApiModule.api, "getManageArticle").mockResolvedValue({
      id: 3,
      titulo: "orig",
      slug: "orig",
      sessoes: [],
      categoria: "OUTROS",
      publicado: true,
    });

    const updateSpy = vi
      .spyOn(ApiModule.api, "updateArticle")
      .mockResolvedValue({
        id: 3,
        titulo: "orig",
        slug: "orig",
        sessoes: [],
        categoria: "OUTROS",
        publicado: true,
      });

    render(
      <MemoryRouter initialEntries={["/dashboard/artigos/3/editar"]}>
        <Routes>
          <Route
            path="/dashboard/artigos/:id/editar"
            element={<ArticleEditor />}
          />
        </Routes>
      </MemoryRouter>,
    );

    // wait for editor to load (title input)
    const titleInput = await screen.findByPlaceholderText(/Digite o título/i);
    expect(titleInput).toHaveValue("orig");

    // change title and click Save
    const title = screen.getByPlaceholderText(/Digite o título/i);
    fireEvent.change(title, { target: { value: "novo título" } });

    const saveBtn = screen.getByRole("button", { name: /^Salvar$/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalled();
      const callArgs = updateSpy.mock.calls[0];
      const payload = callArgs.length === 2 ? callArgs[1] : callArgs[0];
      // ensure published state preserved (true)
      expect(payload.publicado).toBe(true);
      expect(payload.titulo).toBe("novo título");
    });
  });

  test("allows entering cover URL and sends it when creating", async () => {
    const createSpy = vi
      .spyOn(ApiModule.api, "createArticle")
      .mockResolvedValue({
        id: 11,
        titulo: "capa",
        slug: "capa",
        sessoes: [],
        categoria: "OUTROS",
        publicado: false,
      });

    render(
      <MemoryRouter>
        <ArticleEditor />
      </MemoryRouter>,
    );

    // cover URL mode by default; type URL
    const coverInput = screen.getByPlaceholderText(
      /https:\/\/... \(opcional\)/i,
    );
    fireEvent.change(coverInput, {
      target: { value: "https://cdn/capa.png" },
    });
 
    // add a minimal session to pass validation (publishing requires at least one session)
    fireEvent.click(screen.getByRole("button", { name: /Parágrafo/i }));
    const para = screen.getByPlaceholderText(/Digite o parágrafo/i);
    fireEvent.change(para, { target: { value: "conteúdo" } });
    fireEvent.blur(para);

     // fill title and publish
     fireEvent.change(screen.getByPlaceholderText(/Digite o título/i), {
       target: { value: "Título Capa Upload" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Publicar/i }));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalled();
      const payload = createSpy.mock.calls[0][0];
      expect(payload.capaUrl).toBe("https://cdn/capa.png");
    });
  });

  test("allows uploading a cover file and sends Base64 to API", async () => {
    const createSpy = vi
      .spyOn(ApiModule.api, "createArticle")
      .mockResolvedValue({
        id: 12,
        titulo: "capa",
        slug: "capa",
        sessoes: [],
        categoria: "OUTROS",
        publicado: false,
      });

    // stub FileReader to synchronously return a data URL
    const fakeDataUrl = "data:image/png;base64,AAA";
    const OriginalFileReader = globalThis.FileReader;

    vi.stubGlobal(
      "FileReader",
      class {
        onload: ((ev: { target: { result: string } }) => void) | null = null;
        readAsDataURL() {
          if (typeof this.onload === "function") {
            this.onload({ target: { result: fakeDataUrl } });
          }
        }
      } as unknown as typeof FileReader,
    );

    render(
      <MemoryRouter>
        <ArticleEditor />
      </MemoryRouter>,
    );

    // switch to cover upload mode and choose file
    fireEvent.click(screen.getByRole("button", { name: /Enviar capa/i }));
    const chooseBtn = screen.getByRole("button", {
      name: /Escolher arquivo/i,
    });
    fireEvent.click(chooseBtn);

    const fileInput = document.querySelector(
      'input[data-testid="file-input-capa"]',
    ) as HTMLInputElement | null;
    expect(fileInput).not.toBeNull();
    const file = new File(["a"], "capa.png", { type: "image/png" });
    const fileList = {
      0: file,
      length: 1,
      item: (i: number) => (i === 0 ? file : null),
    } as unknown as FileList;
    // set FileList by dispatching a change event (do not redefine non-configurable props)
    fireEvent.change(fileInput as HTMLInputElement, {
      target: { files: fileList },
    });

    // add a minimal session to pass validation (publishing requires at least one session)
    fireEvent.click(screen.getByRole("button", { name: /Parágrafo/i }));
    const para = screen.getByPlaceholderText(/Digite o parágrafo/i);
    fireEvent.change(para, { target: { value: "conteúdo upload" } });
    fireEvent.blur(para);

    // fill title and publish
    fireEvent.change(screen.getByPlaceholderText(/Digite o título/i), {
      target: { value: "Título Capa Upload" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Publicar/i }));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalled();
      const payload = createSpy.mock.calls[0][0];
      expect(payload.capaUrl).toMatch(/^data:image\/png;base64,/);
    });

    // restore FileReader
    vi.stubGlobal(
      "FileReader",
      OriginalFileReader as unknown as typeof FileReader,
    );
  });

  test.skip("allows uploading a file and sends Base64 to API", async () => {
    const createSpy = vi
      .spyOn(ApiModule.api, "createArticle")
      .mockResolvedValue({
        id: 2,
        titulo: "sessao",
        slug: "sessao",
        sessoes: [],
        categoria: "OUTROS",
        publicado: false,
      });

    // stub FileReader to synchronously return a data URL
    const fakeDataUrl = "data:image/png;base64,AAA";
    const OriginalFileReader = globalThis.FileReader;

    vi.stubGlobal(
      "FileReader",
      class {
        onload: ((ev: { target: { result: string } }) => void) | null = null;
        readAsDataURL() {
          if (typeof this.onload === "function") {
            this.onload({ target: { result: fakeDataUrl } });
          }
        }
      } as unknown as typeof FileReader,
    );

    render(
      <MemoryRouter>
        <ArticleEditor />
      </MemoryRouter>,
    );

    // add image section
    fireEvent.click(screen.getByRole("button", { name: /Imagem/i }));

    // switch to upload mode
    fireEvent.click(screen.getByRole("button", { name: /Enviar imagem/i }));

    // locate hidden file input and fire change (match by data-testid)
    const fileInput = document.querySelector(
      'input[data-testid^="file-input-"]',
    ) as HTMLInputElement | null;
    expect(fileInput).not.toBeNull();
    const file = new File(["a"], "img.png", { type: "image/png" });

    // trigger the change event (polyfill a minimal FileList and dispatch)
    const fileList = {
      0: file,
      length: 1,
      item: (i: number) => (i === 0 ? file : null),
    } as unknown as FileList;
    // dispatch change with the fake FileList instead of redefining input.files
    fireEvent.change(fileInput as HTMLInputElement, {
      target: { files: fileList },
    });

    // wait for preview to appear (ensures parent state was updated)
    await screen.findByAltText(/Pré-visualização/i);

    // fill title and publish
    fireEvent.change(screen.getByPlaceholderText(/Digite o título/i), {
      target: { value: "Título upload" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Publicar/i }));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalled();
      const payload = createSpy.mock.calls[0][0];
      expect(payload.artigoSessoes[0].imagemUrl).toMatch(
        /^data:image\/png;base64,/,
      );
    });

    // restore FileReader
    vi.stubGlobal(
      "FileReader",
      OriginalFileReader as unknown as typeof FileReader,
    );
  });

  test("typing in a session textarea preserves focus after debounced update", async () => {
    vi.useFakeTimers();

    render(
      <MemoryRouter>
        <ArticleEditor />
      </MemoryRouter>,
    );

    // add paragraph session
    fireEvent.click(screen.getByRole("button", { name: /Parágrafo/i }));

    const ta = screen.getByPlaceholderText(
      /Digite o parágrafo/i,
    ) as HTMLTextAreaElement;
    ta.focus();
    expect(document.activeElement).toBe(ta);

    // type and wait less than debounce -> still focused
    fireEvent.change(ta, { target: { value: "first" } });
    expect(document.activeElement).toBe(ta);

    // advance past debounce timer — parent update may occur
    vi.advanceTimersByTime(300);
    // flush microtasks
    await Promise.resolve();

    // textarea should remain focused and accept further input without extra click
    expect(document.activeElement).toBe(ta);
    fireEvent.change(ta, { target: { value: "first-more" } });
    expect(ta.value).toBe("first-more");

    vi.useRealTimers();
  });

  test("changing unrelated parent field preserves focus in session textarea", async () => {
    render(
      <MemoryRouter>
        <ArticleEditor />
      </MemoryRouter>,
    );

    // add paragraph session and focus it
    fireEvent.click(screen.getByRole("button", { name: /Parágrafo/i }));
    const ta = screen.getByPlaceholderText(
      /Digite o parágrafo/i,
    ) as HTMLTextAreaElement;
    ta.focus();
    expect(document.activeElement).toBe(ta);

    // change title input (this updates parent form and triggers a re-render)
    const title = screen.getByPlaceholderText(
      /Digite o título/i,
    ) as HTMLInputElement;
    fireEvent.change(title, { target: { value: "novo título" } });

    // textarea must remain focused
    expect(document.activeElement).toBe(ta);
  });

  test('"Escolher arquivo" button triggers native file picker (calls input.click)', async () => {
    render(
      <MemoryRouter>
        <ArticleEditor />
      </MemoryRouter>,
    );

    // add image section and switch to upload
    fireEvent.click(screen.getByRole("button", { name: /Imagem/i }));
    fireEvent.click(screen.getByRole("button", { name: /Enviar imagem/i }));

    const spy = vi
      .spyOn(HTMLInputElement.prototype, "click")
      .mockImplementation(() => {});
    const chooseBtn = screen.getByRole("button", {
      name: /Escolher arquivo/i,
    });
    fireEvent.click(chooseBtn);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
