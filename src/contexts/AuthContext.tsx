import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  api,
  User,
  AuthResponse,
  ApiError,
  Solicitacao,
  StatusSolicitacao,
  TipoSolicitacao,
} from "@/lib/api";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (login: string, senha: string) => Promise<void>;
  register: (data: {
    nome: string;
    login: string;
    email: string;
    senha: string;
    perfil: "estudante" | "docente" | "servidor" | "bolsista";
  }) => Promise<void>;
  logout: () => Promise<void>;
  canPublish: boolean;
  isAdmin: boolean;
  isProfessor: boolean;
  isTecnico: boolean;
  isBolsista: boolean;
  isApproved: boolean;
  mySolicitacao: Solicitacao | null;
  refreshSolicitacao: () => Promise<void>;
  createSolicitacao: (
    tipo: TipoSolicitacao,
    mensagem?: string,
  ) => Promise<Solicitacao>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mySolicitacao, setMySolicitacao] = useState<Solicitacao | null>(null);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const userData = await api.getProfile();
      setUser(userData);

      // Defensive: fetch solicitacoes immediately for the loaded profile (avoid relying
      // exclusively on the `user` effect since React state updates are async at runtime).
      // initiate solicitacoes fetch but don't block loadUser (avoid keeping
      // isLoading=true while the solicitacoes endpoint is slow). The fetch is
      // fire-and-forget here; refreshSolicitacao remains the canonical, awaited
      // way to refresh later.
      api
        .getSolicitacoes()
        .then((all) => {
          const arr = normalizeSolicitacoes(all);
          const mine = arr.find((s) => s.usuarioId === userData.id) ?? null;
          setMySolicitacao(mine);
        })
        .catch(() => setMySolicitacao(null));
    } catch (error) {
      localStorage.removeItem("auth_token");
      setUser(null);
      setMySolicitacao(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const normalizeSolicitacoes = (res: any): Solicitacao[] => {
    if (Array.isArray(res)) return res as Solicitacao[];
    if (res && Array.isArray((res as any).data))
      return (res as any).data as Solicitacao[];
    if (res && Array.isArray((res as any).solicitacoes))
      return (res as any).solicitacoes as Solicitacao[];
    return [];
  };

  const refreshSolicitacao = useCallback(async () => {
    if (!user) return;
    try {
      const all = await api.getSolicitacoes();
      const arr = normalizeSolicitacoes(all);
      const mine = arr.find((s) => s.usuarioId === user.id) ?? null;
      setMySolicitacao(mine);
    } catch (err) {
      setMySolicitacao(null);
    }
  }, [user]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    // after user is loaded, fetch the user's solicitation (if any)
    if (user) refreshSolicitacao();
  }, [user, refreshSolicitacao, isLoading]);

  const login = async (loginStr: string, senha: string) => {
    const response: AuthResponse = await api.login(loginStr, senha);
    localStorage.setItem("auth_token", response.token);
    setUser(response.user);
    // after login, load solicitation
    try {
      const all = await api.getSolicitacoes();
      const arr = normalizeSolicitacoes(all);
      const mine = arr.find((s) => s.usuarioId === response.user.id) ?? null;
      setMySolicitacao(mine);
    } catch (err) {
      setMySolicitacao(null);
    }
  };

  const register = async (data: {
    nome: string;
    login: string;
    email: string;
    senha: string;
    perfil: "estudante" | "docente" | "servidor" | "bolsista";
  }) => {
    const response: AuthResponse = await api.register(data);
    localStorage.setItem("auth_token", response.token);
    setUser(response.user);
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (error) {
      // Even if logout fails, clear local state
    }
    localStorage.removeItem("auth_token");
    setUser(null);
    setMySolicitacao(null);
  };

  const createSolicitacao = async (
    tipo: TipoSolicitacao,
    mensagem?: string,
  ) => {
    const s = await api.createSolicitacao(tipo, mensagem);
    // refresh local
    await refreshSolicitacao();
    return s;
  };

  const canPublish = user
    ? [
        "DOCENTE",
        "PROFESSOR",
        "SERVIDOR",
        "TECNICO_ADMINISTRATIVO",
        "BOLSISTA",
        "ADMINISTRADOR",
      ].includes(user.papel)
    : false;

  const isAdmin = user?.papel === "ADMINISTRADOR";
  // accept both legacy/frontend and backend tokens for professor
  const isProfessor = user?.papel === "DOCENTE" || user?.papel === "PROFESSOR";
  // backend uses TECNICO_ADMINISTRATIVO; keep backwards-compatibility with legacy 'SERVIDOR'
  const isTecnico =
    user?.papel === "SERVIDOR" || user?.papel === "TECNICO_ADMINISTRATIVO";
  const isBolsista = user?.papel === "BOLSISTA";

  const isApproved =
    // prefer backend-provided signal when available (fast and canonical)
    (user as any)?.isApproved === true ||
    // tolerate both normalized and legacy/status-enum shapes from the API
    (!!mySolicitacao &&
      (mySolicitacao.status === "APROVADA" ||
        mySolicitacao.status === "ACEITA"));

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        canPublish,
        isAdmin,
        isProfessor,
        isTecnico,
        isBolsista,
        isApproved,
        mySolicitacao,
        refreshSolicitacao,
        createSolicitacao,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
