import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { TipoSolicitacao } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/layout/Header";

const MAX_MSG = 500;

export default function StatusPage() {
  const {
    user,
    isLoading,
    mySolicitacao,
    refreshSolicitacao,
    createSolicitacao,
  } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [tipo, setTipo] = useState<TipoSolicitacao>("BOLSISTA");
  const [mensagem, setMensagem] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    }
  }, [isLoading, user, navigate]);

  if (isLoading) return <div>Carregando...</div>;

  const validate = () => {
    if (mensagem.length > MAX_MSG) {
      setError(`Mensagem muito longa — máximo ${MAX_MSG} caracteres`);
      return false;
    }
    setError(null);
    return true;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await createSolicitacao(tipo, mensagem || undefined);
      await refreshSolicitacao();
      toast({
        title: "Solicitação enviada",
        description: "Aguarde a análise da equipe.",
      });
    } catch (err: any) {
      toast({
        title: "Erro ao enviar solicitação",
        description: err?.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main className="p-6 lg:p-8 lg:pl-64 max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">
          Status da sua solicitação
        </h1>

        <div aria-live="polite" className="sr-only" />

        {!mySolicitacao && (
          <div className="space-y-4">
            <p>
              Você ainda não possui uma solicitação. Crie uma para ter acesso à
              dashboard.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoSolicitacao)}
                className="input"
                aria-label="Tipo de solicitação"
              >
                <option value="BOLSISTA">Bolsista</option>
                <option value="PROFESSOR">Professor</option>
                <option value="TECNICO">Técnico Adm.</option>
              </select>

              <input
                className="input flex-1"
                placeholder="Mensagem (opcional)"
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                aria-invalid={!!error}
                aria-describedby={error ? "msg-error" : undefined}
              />

              <Button
                onClick={handleCreate}
                disabled={submitting || !!error}
                aria-disabled={submitting || !!error}
              >
                {submitting ? "Enviando..." : "Solicitar"}
              </Button>
            </div>

            {error && (
              <p
                id="msg-error"
                className="text-sm text-destructive mt-1"
                role="alert"
              >
                {error}
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              Máx. {MAX_MSG} caracteres
            </p>
          </div>
        )}

        {mySolicitacao && (
          <div className="mt-6 space-y-4">
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Tipo</p>
              <p className="font-medium">{mySolicitacao.tipo}</p>

              <p className="text-sm text-muted-foreground mt-3">Status</p>
              <p className="font-medium">{mySolicitacao.status}</p>

              {mySolicitacao.mensagem && (
                <>
                  <p className="text-sm text-muted-foreground mt-3">Mensagem</p>
                  <p>{mySolicitacao.mensagem}</p>
                </>
              )}
            </div>

            {mySolicitacao.status === "PENDENTE" && (
              <div className="p-4 rounded border">
                <p className="text-sm">
                  Sua solicitação está pendente de análise.
                </p>
              </div>
            )}

            {mySolicitacao.status === "REJEITADA" && (
              <div className="p-4 rounded border space-y-3">
                <p className="text-sm">
                  Sua solicitação foi rejeitada — você pode reenviar uma nova
                  solicitação.
                </p>
                <div className="flex gap-3">
                  <input
                    className="input flex-1"
                    placeholder="Mensagem para reenvio (opcional)"
                    value={mensagem}
                    onChange={(e) => setMensagem(e.target.value)}
                    aria-invalid={!!error}
                    aria-describedby={error ? "msg-error" : undefined}
                  />
                  <Button
                    onClick={async () => {
                      if (!validate()) return;
                      setSubmitting(true);
                      try {
                        await createSolicitacao(
                          mySolicitacao.tipo as TipoSolicitacao,
                          mensagem || undefined,
                        );
                        await refreshSolicitacao();
                        toast({
                          title: "Solicitação reenviada",
                          description: "Aguarde nova avaliação.",
                        });
                      } catch (err: any) {
                        toast({
                          title: "Erro ao reenviar",
                          description: err?.message || "Tente novamente",
                          variant: "destructive",
                        });
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                    disabled={submitting || !!error}
                  >
                    {submitting ? "Enviando..." : "Reenviar"}
                  </Button>
                </div>

                {error && (
                  <p
                    id="msg-error"
                    className="text-sm text-destructive mt-1"
                    role="alert"
                  >
                    {error}
                  </p>
                )}
              </div>
            )}

            {mySolicitacao.status === "APROVADA" && (
              <div className="p-4 rounded border flex items-center justify-between">
                <div>
                  <p className="font-medium">Solicitação aprovada</p>
                  <p className="text-sm text-muted-foreground">
                    Você já tem acesso à dashboard.
                  </p>
                </div>
                <Button onClick={() => navigate("/dashboard")}>
                  Ir para Dashboard
                </Button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
