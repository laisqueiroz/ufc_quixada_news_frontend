import React, { useEffect, useState } from "react";
import { api, User } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";

export default function UsuariosPage() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    login: "",
    email: "",
    senha: "",
    papel: "VISITANTE",
  });
  // per-row editing state: which user is being edited and staged papel
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingPapel, setEditingPapel] = useState<string | null>(null);
  // track which row is currently being updated (disables Save for that row)
  const [changingRoleFor, setChangingRoleFor] = useState<number | null>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getUsers();
      // intentionally omit sensitive fields if any (server should not send them)
      setUsers(
        res.map(
          (u) =>
            ({
              id: u.id,
              nome: u.nome,
              login: u.login,
              email: u.email,
              papel: u.papel,
              criadoEm: (u as any).criadoEm,
            }) as User,
        ),
      );
    } catch (err) {
      toast({ title: "Erro ao carregar usuários", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    load();
  }, [isAdmin]);

  const handleCreate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setCreating(true);
    try {
      // do not pass or show sensitive fields after creation
      await api.createUserAdmin({
        nome: form.nome,
        login: form.login,
        email: form.email,
        senha: form.senha,
        papel: form.papel,
      });
      toast({ title: "Usuário criado" });
      setForm({
        nome: "",
        login: "",
        email: "",
        senha: "",
        papel: "VISITANTE",
      });
      await load();
    } catch (err: any) {
      toast({
        title: "Falha ao criar usuário",
        description: err?.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleChangeRole = async (id: number, papel: string) => {
    setChangingRoleFor(id);
    try {
      await api.updateUserRole(id, papel);
      toast({ title: "Papel atualizado" });
      // close the inline editor on success
      setEditingId(null);
      setEditingPapel(null);
      await load();
    } catch (err: any) {
      toast({
        title: "Erro ao atualizar papel",
        description: err?.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setChangingRoleFor(null);
    }
  };

  if (!isAdmin) return <div className="p-6">Acesso negado</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">
            Usuários
          </h1>
          <p className="text-muted-foreground">
            Gerencie contas de usuários — criação e alteração de papel (dados
            sensíveis não são exibidos).
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button">Novo usuário</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Criar usuário</AlertDialogTitle>
                <AlertDialogDescription>
                  Preencha os dados do novo usuário. Senhas são enviadas ao
                  servidor e não serão mostradas na lista.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="grid gap-2 py-4">
                <Input
                  placeholder="Nome"
                  value={form.nome}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, nome: e.target.value }))
                  }
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="Login"
                    value={form.login}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, login: e.target.value }))
                    }
                  />
                  <Input
                    placeholder="Email"
                    value={form.email}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, email: e.target.value }))
                    }
                  />
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Senha (opcional)"
                    value={form.senha}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, senha: e.target.value }))
                    }
                  />
                  <Select
                    onValueChange={(v) => setForm((p) => ({ ...p, papel: v }))}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Papel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VISITANTE">Visitante</SelectItem>
                      <SelectItem value="ESTUDANTE">Estudante</SelectItem>
                      <SelectItem value="PROFESSOR">Professor</SelectItem>
                      <SelectItem value="TECNICO_ADMINISTRATIVO">
                        Técnico administrativo
                      </SelectItem>
                      <SelectItem value="BOLSISTA">Bolsista</SelectItem>
                      <SelectItem value="ADMINISTRADOR">
                        Administrador
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button onClick={handleCreate} disabled={creating}>
                    Criar
                  </Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Login</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.id}</TableCell>
                <TableCell className="font-medium">{u.nome}</TableCell>
                <TableCell>{u.login}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.papel}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2 items-center">
                    {/** show Edit button by default; reveal Select + Save/Cancel when editing */}
                    {editingId === u.id ? (
                      <>
                        <Select
                          onValueChange={(v) => setEditingPapel(v)}
                          defaultValue={u.papel}
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="VISITANTE">Visitante</SelectItem>
                            <SelectItem value="ESTUDANTE">Estudante</SelectItem>
                            <SelectItem value="PROFESSOR">Professor</SelectItem>
                            <SelectItem value="TECNICO_ADMINISTRATIVO">
                              Técnico administrativo
                            </SelectItem>
                            <SelectItem value="BOLSISTA">Bolsista</SelectItem>
                            <SelectItem value="ADMINISTRADOR">
                              Administrador
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          disabled={changingRoleFor === u.id}
                          onClick={async () => {
                            // tolerate very fast clicks: fall back to the row's current papel
                            const papelToSave =
                              editingPapel ?? u.papel ?? "VISITANTE";
                            if (!papelToSave) return;
                            await handleChangeRole(u.id, papelToSave);
                          }}
                          aria-busy={changingRoleFor === u.id}
                        >
                          Salvar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingId(null);
                            setEditingPapel(null);
                          }}
                        >
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingId(u.id);
                            setEditingPapel(u.papel || "VISITANTE");
                          }}
                        >
                          Editar
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {users.length === 0 && !loading && (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Nenhum usuário encontrado
          </div>
        )}
      </div>
    </div>
  );
}
