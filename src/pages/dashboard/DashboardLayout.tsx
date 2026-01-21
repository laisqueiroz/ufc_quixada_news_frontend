import { useState, useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Newspaper,
  Plus,
  FileText,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Visão Geral", href: "/dashboard" },
  { icon: Newspaper, label: "Meus Artigos", href: "/dashboard/artigos" },
  { icon: Plus, label: "Novo Artigo", href: "/dashboard/artigos/novo" },
];

const adminItems = [
  { icon: Users, label: "Usuários", href: "/dashboard/usuarios" },
  { icon: FileText, label: "Solicitações", href: "/dashboard/solicitacoes" },
];

export default function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const {
    user,
    isLoading,
    logout,
    canPublish,
    isAdmin,
    isApproved,
    isProfessor,
    isTecnico,
  } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // do not redirect while initial profile is loading — otherwise page reload
    // causes a transient redirect for valid admins (reported bug).
    if (isLoading) return;

    // allow access if user is admin, approved, or has publishing privileges
    // exception: allow rendering the `/status` page inside this layout so the
    // status screen can reuse the dashboard Navbar and visual chrome.
    if (
      !isAdmin &&
      !isApproved &&
      !canPublish &&
      location.pathname !== "/status"
    ) {
      navigate("/status");
    }
  }, [isLoading, isAdmin, isApproved, canPublish, navigate, location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  // allow `/status` to render even when the user is not approved so the
  // page uses the same dashboard chrome (sidebar/header) required by the spec
  // don't block initial render while the profile is loading
  if (
    !isLoading &&
    !isAdmin &&
    !isApproved &&
    !canPublish &&
    location.pathname !== "/status"
  ) {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 bg-sidebar border-b border-sidebar-border">
        <div className="flex items-center justify-between px-4 h-16">
          <Link to="/" className="text-sidebar-foreground font-serif font-bold">
            Jornal UFC
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-sidebar transform transition-transform duration-200 ease-in-out lg:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-6 border-b border-sidebar-border">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded bg-sidebar-primary flex items-center justify-center">
                <Newspaper className="h-4 w-4 text-sidebar-primary-foreground" />
              </div>
              <span className="text-sidebar-foreground font-serif font-bold">
                Jornal UFC
              </span>
            </Link>
          </div>

          {/* User Info */}
          <div className="px-4 py-4 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-sidebar-accent flex items-center justify-center">
                <span className="text-sm font-semibold text-sidebar-accent-foreground">
                  {user?.nome?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {user?.nome}
                </p>
                <p className="text-xs text-sidebar-foreground/60 capitalize">
                  {user?.papel?.toLowerCase()}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            <p className="px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-2">
              Gerenciar
            </p>
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                  {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
                </Link>
              );
            })}

            {isAdmin && (
              <>
                <p className="px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mt-6 mb-2">
                  Administração
                </p>
                {adminItems.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setIsSidebarOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                      {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
                    </Link>
                  );
                })}
              </>
            )}

            {(isProfessor || isTecnico) && (
              <>
                <p className="px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mt-6 mb-2">
                  Aprovadores
                </p>
                <Link
                  to="/dashboard/solicitacoes"
                  onClick={() => setIsSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                    location.pathname === "/dashboard/solicitacoes"
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
                  )}
                >
                  <FileText className="h-4 w-4" />
                  Solicitações
                </Link>
              </>
            )}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-sidebar-border space-y-2">
            <Link
              to="/"
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
            >
              <Newspaper className="h-4 w-4" />
              Ver Portal
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors w-full text-left"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="lg:pl-64">
        <div className="p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
