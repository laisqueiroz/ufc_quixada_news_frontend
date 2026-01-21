// API Configuration and Types

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Types based on the OpenAPI spec
export type Papel =
  | "ESTUDANTE"
  | "DOCENTE"
  | "SERVIDOR"
  | "BOLSISTA"
  | "ADMINISTRADOR"
  | "VISITANTE";
export type Categoria =
  | "EVENTOS"
  | "OPORTUNIDADES"
  | "PESQUISA"
  | "PROJETOS"
  | "AVISOS"
  | "OUTROS";
export type TipoReacao =
  | "CURTIDA"
  | "AMEI"
  | "TRISTE"
  | "SURPRESO"
  | "PARABENS";
export type TipoSessao = "PARAGRAFO" | "TOPICO" | "IMAGEM";
export type TipoSolicitacao = "PROFESSOR" | "TECNICO" | "BOLSISTA";
export type StatusSolicitacao = "PENDENTE" | "APROVADA" | "REJEITADA";

export interface User {
  id: number;
  login: string;
  email: string;
  nome: string;
  papel: Papel;
  isApproved?: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ArtigoSessao {
  ordem: number;
  tipo: TipoSessao;
  texto?: string;
  imagemUrl?: string;
}

export interface Artigo {
  id: number;
  titulo: string;
  slug: string;
  resumo?: string;
  capaUrl?: string;
  categoria: Categoria;
  publicado: boolean;
  publicadoEm?: string;
  sessoes: ArtigoSessao[];
  reacoes?: Record<TipoReacao, number>;
}

export interface ArtigoListResponse {
  items: Artigo[];
  nextCursor?: number | null;
  nextPage?: number | null;
}

export interface Autor {
  id: number;
  nome: string;
  login: string;
}

export interface Comentario {
  id: number;
  conteudo: string;
  autor: Autor;
  comentarioPaiId?: number;
  respondeAId?: number;
  respostas?: Comentario[];
  criadoEm?: string;
}

export interface Solicitacao {
  id: number;
  usuarioId: number;
  usuarioNome?: string;
  tipo: TipoSolicitacao;
  status: StatusSolicitacao;
  mensagem?: string;
  criadoEm: string;
}

// API Client Class
export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    return localStorage.getItem("auth_token");
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const token = this.getToken();
    const headers: HeadersInit = {
      ...(options.body !== undefined
        ? { "Content-Type": "application/json" }
        : {}),
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(
        response.status,
        error.message || "Erro na requisição",
        error,
      );
    }

    // If there is no content (e.g., 204) or the response is not JSON, return undefined
    const contentType = response.headers.get("content-type") || "";
    if (response.status === 204 || !contentType.includes("application/json")) {
      return undefined as unknown as T;
    }

    return response.json();
  }

  // Auth endpoints
  async login(login: string, senha: string): Promise<AuthResponse> {
    return this.request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ login, senha }),
    });
  }

  async register(data: {
    nome: string;
    login: string;
    email: string;
    senha: string;
    perfil: "estudante" | "docente" | "servidor" | "bolsista" | "visitante";
  }): Promise<AuthResponse> {
    return this.request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async logout(): Promise<void> {
    await this.request("/auth/logout", { method: "POST" });
    localStorage.removeItem("auth_token");
  }

  async forgotPassword(email: string): Promise<{ ok: boolean }> {
    return this.request("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, senha: string): Promise<{ ok: boolean }> {
    return this.request("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, senha }),
    });
  }

  async getProfile(): Promise<User> {
    return this.request<User>("/auth/profile");
  }

  // Public News endpoints
  async getNews(params?: {
    limite?: number;
    cursor?: number;
    pagina?: number;
    busca?: string;
    categoria?: Categoria;
    dataInicial?: string;
    dataFinal?: string;
    autorId?: number;
  }): Promise<ArtigoListResponse> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return this.request<ArtigoListResponse>(`/news${query ? `?${query}` : ""}`);
  }

  async getNewsBySlug(slug: string): Promise<Artigo> {
    return this.request<Artigo>(`/news/${slug}`);
  }

  async getNewsPreviewBySlug(slug: string): Promise<Artigo> {
    return this.request<Artigo>(`/news/${slug}/preview`);
  }

  async getReactions(articleId: number): Promise<Record<TipoReacao, number>> {
    return this.request<Record<TipoReacao, number>>(
      `/news/${articleId}/reacoes`,
    );
  }

  async getMyReaction(
    articleId: number,
  ): Promise<{ id: number | null; tipo: TipoReacao | null }> {
    const res = await this.request<any>(`/news/${articleId}/reacao`);
    // normalize to object { id, tipo }
    if (res === null) return { id: null, tipo: null };
    if (typeof res === "string") return { id: null, tipo: res as TipoReacao };
    if (res && typeof res === "object")
      return { id: (res as any).id ?? null, tipo: (res as any).tipo ?? null };
    return { id: null, tipo: null };
  }

  async createReaction(articleId: number, tipo: TipoReacao): Promise<void> {
    await this.request(`/news/${articleId}/reacoes`, {
      method: "POST",
      body: JSON.stringify({ tipo }),
    });
  }

  async deleteReaction(articleId: number): Promise<{ ok: boolean }> {
    return this.request<{ ok: boolean }>(`/news/${articleId}/reacoes`, {
      method: "DELETE",
    });
  }

  async deleteReactionById(
    articleId: number,
    reacaoId: number,
  ): Promise<{ ok: boolean }> {
    return this.request<{ ok: boolean }>(
      `/news/${articleId}/reacoes/${reacaoId}`,
      {
        method: "DELETE",
      },
    );
  }

  // Comments endpoints
  async getComments(articleId: number): Promise<Comentario[]> {
    return this.request<Comentario[]>(`/news/${articleId}/comentarios`);
  }

  async createComment(
    articleId: number,
    conteudo: string,
    comentarioPaiId?: number,
  ): Promise<Comentario> {
    return this.request<Comentario>(`/news/${articleId}/comentarios`, {
      method: "POST",
      body: JSON.stringify({ conteudo, comentarioPaiId }),
    });
  }

  async updateComment(commentId: number, conteudo: string): Promise<void> {
    await this.request(`/comentarios/${commentId}`, {
      method: "PATCH",
      body: JSON.stringify({ conteudo }),
    });
  }

  async deleteComment(commentId: number): Promise<void> {
    await this.request(`/comentarios/${commentId}`, { method: "DELETE" });
  }

  // Comment reaction endpoints
  async getCommentReactions(
    articleId: number,
    comentarioId: number,
  ): Promise<Record<string, number>> {
    return this.request<Record<string, number>>(
      `/news/${articleId}/comentarios/${comentarioId}/reacoes`,
    );
  }

  async getMyCommentReaction(
    articleId: number,
    comentarioId: number,
  ): Promise<{ id: number | null; tipo: string | null }> {
    const res = await this.request<any>(
      `/news/${articleId}/comentarios/${comentarioId}/reacao`,
    );
    if (res === null) return { id: null, tipo: null };
    if (typeof res === "object")
      return { id: (res as any).id ?? null, tipo: (res as any).tipo ?? null };
    return { id: null, tipo: null };
  }

  async createCommentReaction(
    articleId: number,
    comentarioId: number,
    tipo: string,
  ): Promise<void> {
    await this.request(
      `/news/${articleId}/comentarios/${comentarioId}/reacoes`,
      {
        method: "POST",
        body: JSON.stringify({ tipo }),
      },
    );
  }

  async deleteCommentReaction(
    articleId: number,
    comentarioId: number,
  ): Promise<{ ok: boolean }> {
    return this.request<{ ok: boolean }>(
      `/news/${articleId}/comentarios/${comentarioId}/reacoes`,
      { method: "DELETE" },
    );
  }

  async deleteCommentReactionById(
    articleId: number,
    comentarioId: number,
    reacaoId: number,
  ): Promise<{ ok: boolean }> {
    return this.request<{ ok: boolean }>(
      `/news/${articleId}/comentarios/${comentarioId}/reacoes/${reacaoId}`,
      { method: "DELETE" },
    );
  }

  // Manage Articles endpoints
  async getManageArticles(params?: {
    limite?: number;
    cursor?: number;
    pagina?: number;
    busca?: string;
    categoria?: Categoria;
    dataInicial?: string;
    dataFinal?: string;
    autorId?: number;
  }): Promise<ArtigoListResponse> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return this.request<ArtigoListResponse>(
      `/gerenciar/artigos${query ? `?${query}` : ""}`,
    );
  }

  async createArticle(data: {
    titulo: string;
    slug?: string;
    resumo?: string;
    capaUrl?: string;
    categoria?: Categoria;
    publicado?: boolean;
    artigoSessoes?: ArtigoSessao[];
  }): Promise<Artigo> {
    return this.request<Artigo>("/gerenciar/artigos", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getManageArticle(id: number): Promise<Artigo> {
    return this.request<Artigo>(`/gerenciar/artigos/${id}`);
  }

  async checkSlugAvailability(
    slug: string,
    ignoreId?: number,
  ): Promise<boolean> {
    const params = new URLSearchParams();
    params.append("slug", slug);
    if (typeof ignoreId === "number")
      params.append("ignoreId", String(ignoreId));
    const res = await this.request<{ available: boolean } | boolean>(
      `/gerenciar/artigos/slug-available?${params.toString()}`,
    );
    // endpoint may return boolean directly in some implementations - normalize
    if (typeof res === "boolean") return res;
    return (res as any).available === true;
  }

  async updateArticle(
    id: number,
    data: {
      titulo?: string;
      slug?: string;
      resumo?: string;
      capaUrl?: string;
      categoria?: Categoria;
      publicado?: boolean;
      artigoSessoes?: ArtigoSessao[];
    },
  ): Promise<Artigo> {
    return this.request<Artigo>(`/gerenciar/artigos/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteArticle(id: number): Promise<void> {
    await this.request(`/gerenciar/artigos/${id}`, { method: "DELETE" });
  }

  // Users endpoints
  async getUsers(): Promise<User[]> {
    return this.request<User[]>("/users");
  }

  async createUserAdmin(data: {
    nome: string;
    login: string;
    email: string;
    senha?: string;
    papel?: string;
  }): Promise<User> {
    // admin-only endpoint
    return this.request<User>("/admin/users", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateUser(
    id: number,
    data: { nome?: string; login?: string; email?: string },
  ): Promise<User> {
    return this.request<User>(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async updateUserRole(id: number, papel: string): Promise<User> {
    return this.request<User>(`/users/${id}/role`, {
      method: "PATCH",
      body: JSON.stringify({ papel }),
    });
  }

  // Solicitações endpoints
  async getSolicitacoes(): Promise<Solicitacao[]> {
    return this.request<Solicitacao[]>("/solicitacoes");
  }

  // Returns pending solicitations (approvers only)
  async getSolicitacoesPendentes(): Promise<Solicitacao[]> {
    return this.request<Solicitacao[]>("/solicitacoes/pending");
  }

  async createSolicitacao(
    tipo: TipoSolicitacao,
    mensagem?: string,
  ): Promise<Solicitacao> {
    return this.request<Solicitacao>("/solicitacoes", {
      method: "POST",
      body: JSON.stringify({ tipo, mensagem }),
    });
  }

  async aceitarSolicitacao(id: number): Promise<void> {
    await this.request(`/solicitacoes/${id}/aceitar`, { method: "PATCH" });
  }

  async rejeitarSolicitacao(id: number): Promise<void> {
    await this.request(`/solicitacoes/${id}/rejeitar`, { method: "PATCH" });
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const api = new ApiClient(API_BASE_URL);
