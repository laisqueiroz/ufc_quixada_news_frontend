import { Link } from 'react-router-dom';
import { Newspaper, Mail, MapPin, Phone } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Logo and Description */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Newspaper className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-serif font-bold text-foreground">
                  Jornal UFC
                </span>
                <span className="text-xs text-muted-foreground -mt-1">
                  Campus Quixadá
                </span>
              </div>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              Centro de notícias da UFC acessível a toda a comunidade acadêmica e público externo.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Links Rápidos</h3>
            <nav className="flex flex-col gap-2">
              <Link
                to="/"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Início
              </Link>
              <Link
                to="/buscar"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Buscar Notícias
              </Link>
              <Link
                to="/auth"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Área do Usuário
              </Link>
            </nav>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Contato</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  Av. José de Freitas Queiroz, 5003<br />
                  Cedro - Quixadá, CE
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <span>(88) 3412-1700</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span>comunicacao@quixada.ufc.br</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8">
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Universidade Federal do Ceará - Campus Quixadá. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
