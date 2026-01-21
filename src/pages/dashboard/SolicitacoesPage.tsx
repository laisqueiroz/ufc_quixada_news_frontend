import React, { useEffect, useState } from "react";
import { api, Solicitacao } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  Table,
  TableHeader,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function SolicitacoesPage() {
  const { user, isAdmin, isProfessor, isTecnico } = useAuth();
  const [items, setItems] = useState<Solicitacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const res =
        isAdmin || isProfessor || isTecnico
          ? await api.getSolicitacoesPendentes()
          : await api.getSolicitacoes();
      setItems(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const canActOn = (s: Solicitacao) => {
    if (isAdmin) return true;
    // both Professor and Técnico Administrativo can act on BOLSISTA requests
    if (isProfessor || isTecnico) return s.tipo === "BOLSISTA";
    return false;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">
            Solicitações
          </h1>
          <p className="text-muted-foreground">
            Lista de solicitações pendentes e próprio histórico — ações apenas
            para aprovadores.
          </p>
        </div>
      </div>

      {/* match ArticlesList table container for consistent styling & responsiveness */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Mensagem</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {items.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {s.usuarioNome ?? `${s.usuarioId}`}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      #{s.usuarioId}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{s.tipo}</TableCell>
                <TableCell>{s.status}</TableCell>
                <TableCell className="max-w-[300px] truncate">
                  {s.mensagem ?? "-"}
                </TableCell>
                <TableCell>
                  {canActOn(s) ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="success"
                        disabled={processingId === s.id}
                        onClick={async () => {
                          try {
                            setProcessingId(s.id);
                            await api.aceitarSolicitacao(s.id);
                            toast({ title: "Solicitação aceita" });
                            await load();
                          } catch (err: any) {
                            toast({
                              title: "Erro ao aceitar",
                              description: err?.message || "Tente novamente",
                              variant: "destructive",
                            });
                          } finally {
                            setProcessingId(null);
                          }
                        }}
                      >
                        {processingId === s.id ? "..." : "Aceitar"}
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={processingId === s.id}
                        onClick={async () => {
                          try {
                            setProcessingId(s.id);
                            await api.rejeitarSolicitacao(s.id);
                            toast({ title: "Solicitação rejeitada" });
                            await load();
                          } catch (err: any) {
                            toast({
                              title: "Erro ao rejeitar",
                              description: err?.message || "Tente novamente",
                              variant: "destructive",
                            });
                          } finally {
                            setProcessingId(null);
                          }
                        }}
                      >
                        {processingId === s.id ? "..." : "Rejeitar"}
                      </Button>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Sem permissão
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {items.length === 0 && !loading && (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Nenhuma solicitação encontrada
          </div>
        )}
      </div>
    </div>
  );
}
