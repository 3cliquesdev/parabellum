import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <main className="h-screen flex flex-col items-center justify-center text-center bg-background">
      <h1 className="text-6xl font-bold text-foreground mb-4">404</h1>
      <p className="text-xl text-muted-foreground mb-6">
        Ops! Página não encontrada
      </p>
      <Link 
        to="/" 
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
      >
        Voltar ao Início
      </Link>
    </main>
  );
};

export default NotFound;
