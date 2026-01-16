import { Link } from "react-router-dom";
import { Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 px-4">
        <div className="space-y-2">
          <h1 className="text-6xl font-serif font-bold text-primary">404</h1>
          <h2 className="text-2xl font-serif font-bold text-foreground">
            Página não encontrada
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Desculpe, não conseguimos encontrar a página que você está procurando.
          </p>
        </div>
        <div className="flex justify-center gap-4 flex-wrap">
          <Button asChild>
            <Link to="/">
              <Home className="h-4 w-4 mr-2" />
              Ir para o início
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/buscar">
              <Search className="h-4 w-4 mr-2" />
              Buscar notícias
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
