import React, {
  useState,
  useEffect,
  useRef,
  useLayoutEffect,
  useCallback,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  Save,
  Eye,
  GripVertical,
  Image,
} from "lucide-react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { api, Artigo, ArtigoSessao, Categoria } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const categories: { value: Categoria; label: string }[] = [
  { value: "EVENTOS", label: "Eventos" },
  { value: "OPORTUNIDADES", label: "Oportunidades" },
  { value: "PESQUISA", label: "Pesquisa" },
  { value: "PROJETOS", label: "Projetos" },
  { value: "AVISOS", label: "Avisos" },
  { value: "OUTROS", label: "Outros" },
];

type LocalSessao = ArtigoSessao & {
  _uid?: string;
  id?: number;
  _imgSource?: "url" | "upload";
};

interface FormData {
  titulo: string;
  resumo: string;
  slug: string;
  capaUrl: string;
  categoria: Categoria;
  publicado: boolean;
  sessoes: LocalSessao[];
}

const SortableSection = React.memo(function SortableSection({
  id,
  sessao,
  index,
  onUpdate,
  onRemove,
}: {
  id: string;
  sessao: LocalSessao;
  index: number;
  onUpdate: (u: Partial<LocalSessao>) => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  // dev-only mount/unmount diagnostic to detect unintended remounts
  useEffect(() => {
    // keep minimal/noisy output; remove in production

    console.debug("[SortableSection] mount", sessao._uid);
    return () => console.debug("[SortableSection] unmount", sessao._uid);
  }, [sessao._uid]);
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform) || undefined,
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  // local state to avoid losing focus on parent re-renders
  const [localText, setLocalText] = useState(sessao.texto || "");
  const [localImg, setLocalImg] = useState(sessao.imagemUrl || "");
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textRef = useRef<HTMLTextAreaElement | null>(null);
  const imageUrlRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // only sync external changes into localText when the field is NOT focused
    if (document.activeElement !== textRef.current) {
      setLocalText(sessao.texto || "");
    }
  }, [sessao.texto]);

  useEffect(() => {
    // do not overwrite user edits while the image URL input is focused
    if (document.activeElement !== imageUrlRef.current) {
      setLocalImg(sessao.imagemUrl || "");
    }
  }, [sessao.imagemUrl]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  // restore focus & caret synchronously if we recorded that the textarea was focused
  useLayoutEffect(() => {
    if (hadFocusRef.current && textRef.current) {
      try {
        textRef.current.focus();
        if (caretRef.current?.start != null) {
          textRef.current.setSelectionRange(
            caretRef.current.start,
            caretRef.current.end ?? caretRef.current.start,
          );
        }
      } catch (err) {
        // ignore if DOM selection APIs fail in the environment
      }
      hadFocusRef.current = false;
    }
  }, [localText]);

  // catch-all: if focus was lost by some intermediate update, restore it on the next layout pass
  useLayoutEffect(() => {
    if (
      hadFocusRef.current &&
      textRef.current &&
      document.activeElement !== textRef.current
    ) {
      try {
        textRef.current.focus();
        if (caretRef.current?.start != null) {
          textRef.current.setSelectionRange(
            caretRef.current.start,
            caretRef.current.end ?? caretRef.current.start,
          );
        }
      } catch (err) {
        /* ignore */
      }
      hadFocusRef.current = false;
    }
  });

  // expose the ref to the DOM node (fallback for non-React callers/tests)
  useEffect(() => {
    const el = document.querySelector(
      `input[data-testid=\"file-input-${sessao._uid}\"]`,
    ) as HTMLInputElement | null;
    if (el) fileInputRef.current = el;

    // dev-only: install a MutationObserver to catch layout-causing DOM mutations
    if ((window as any).__ART_EDITOR_DEBUG) {
      const obs = new MutationObserver((mutations) => {
        mutations.forEach((m) => {
          if (
            m.type === "childList" &&
            (m.addedNodes.length || m.removedNodes.length)
          ) {
            console.debug("[ArticleEditor][mutation]", {
              uid: sessao._uid,
              added: m.addedNodes.length,
              removed: m.removedNodes.length,
              scrollTop: document.scrollingElement?.scrollTop,
            });
          }
        });
      });
      obs.observe(document.body, { childList: true, subtree: true });
      return () => obs.disconnect();
    }
  }, [sessao._uid]);

  const caretRef = useRef<{
    start: number | null;
    end: number | null;
  } | null>(null);
  const hadFocusRef = useRef(false);

  const scheduleUpdate = (partial: Partial<LocalSessao>) => {
    // remember whether the textarea is focused and caret position so we can restore after parent update
    hadFocusRef.current = document.activeElement === textRef.current;
    try {
      caretRef.current = textRef.current
        ? {
            start: textRef.current.selectionStart,
            end: textRef.current.selectionEnd,
          }
        : null;
    } catch (err) {
      caretRef.current = null;
    }

    if (timerRef.current) window.clearTimeout(timerRef.current);
    // capture scroll when field is focused so we can restore after parent updates
    const focused = hadFocusRef.current;
    const scrollTop = focused && (document.scrollingElement?.scrollTop ?? 0);
    timerRef.current = window.setTimeout(() => {
      try {
        if (focused && typeof scrollTop === "number") {
          // small delay to allow layout to settle, then restore scroll and focus
          onUpdate(partial);
          requestAnimationFrame(() => {
            try {
              if (document.scrollingElement)
                document.scrollingElement.scrollTop = scrollTop;
              if (hadFocusRef.current && textRef.current) {
                textRef.current.focus();
                if (caretRef.current?.start != null) {
                  textRef.current.setSelectionRange(
                    caretRef.current.start,
                    caretRef.current.end ?? caretRef.current.start,
                  );
                }
              }
            } catch (err) {
              /* best-effort restore */
            }
          });
          return;
        }
      } catch (err) {
        // swallow
      }
      onUpdate(partial);
    }, 250);
  };

  const flushUpdate = (partial: Partial<LocalSessao>) => {
    hadFocusRef.current = document.activeElement === textRef.current;
    try {
      caretRef.current = textRef.current
        ? {
            start: textRef.current.selectionStart,
            end: textRef.current.selectionEnd,
          }
        : null;
    } catch (err) {
      caretRef.current = null;
    }

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    // flush synchronously but preserve scroll/focus if needed
    const focused = hadFocusRef.current;
    const scrollTop = focused && (document.scrollingElement?.scrollTop ?? 0);
    onUpdate(partial);
    if (focused) {
      try {
        if (document.scrollingElement && typeof scrollTop === "number")
          document.scrollingElement.scrollTop = scrollTop;
        if (textRef.current && hadFocusRef.current) {
          textRef.current.focus();
          if (caretRef.current?.start != null) {
            textRef.current.setSelectionRange(
              caretRef.current.start,
              caretRef.current.end ?? caretRef.current.start,
            );
          }
        }
      } catch (err) {
        /* best-effort */
      }
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30"
    >
      <div {...attributes} {...listeners} className="cursor-move mt-2">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
            {sessao.tipo}
          </span>
          <span className="text-xs text-muted-foreground">#{index + 1}</span>
        </div>
        {sessao.tipo === "IMAGEM" ? (
          <div>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                className={cn(
                  "px-2 py-1 rounded text-sm",
                  sessao._imgSource === "url"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/20",
                )}
                onClick={() => {
                  setLocalImg(sessao.imagemUrl || "");
                  onUpdate({ _imgSource: "url" });
                }}
              >
                Usar URL
              </button>
              <button
                type="button"
                className={cn(
                  "px-2 py-1 rounded text-sm",
                  sessao._imgSource === "upload"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/20",
                )}
                onClick={() => {
                  onUpdate({ _imgSource: "upload" });
                }}
              >
                Enviar imagem
              </button>
            </div>

            {sessao._imgSource === "upload" ? (
              <div className="space-y-2">
                <input
                  ref={(el) => {
                    fileInputRef.current = el;
                  }}
                  data-testid={`file-input-${sessao._uid}`}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      const result = String(reader.result || "");
                      setLocalImg(result);
                      // persist immediately (no debounce) so subsequent submit sees the data
                      onUpdate({ imagemUrl: result });
                    };
                    reader.readAsDataURL(f);
                  }}
                />

                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.click();
                        return;
                      }
                      const fallback = document.querySelector(
                        `input[data-testid="file-input-${sessao._uid}"]`,
                      ) as HTMLInputElement | null;
                      fallback?.click();
                    }}
                  >
                    Escolher arquivo
                  </Button>

                  {localImg ? (
                    <div className="flex items-center gap-3">
                      <img
                        src={localImg}
                        alt="Pré-visualização"
                        className="h-24 w-24 object-contain rounded border"
                      />
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setLocalImg("");
                          onUpdate({ imagemUrl: "" });
                        }}
                      >
                        Remover
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma imagem selecionada
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <Input
                id={`sessao-${sessao._uid}-imagemUrl`}
                name={`sessoes[${sessao._uid}].imagemUrl`}
                ref={imageUrlRef}
                placeholder="URL da imagem (ex: https://...)"
                value={localImg}
                onChange={(e) => {
                  setLocalImg(e.target.value);
                  scheduleUpdate({ imagemUrl: e.target.value });
                }}
                onBlur={() => flushUpdate({ imagemUrl: localImg })}
              />
            )}
          </div>
        ) : (
          <Textarea
            key={sessao._uid}
            id={`sessao-${sessao._uid}-texto`}
            name={`sessoes[${sessao._uid}].texto`}
            ref={textRef}
            placeholder={
              sessao.tipo === "PARAGRAFO"
                ? "Digite o parágrafo..."
                : "Digite o tópico..."
            }
            value={localText}
            onChange={(e) => {
              setLocalText(e.target.value);
              scheduleUpdate({ texto: e.target.value });
            }}
            onBlur={() => flushUpdate({ texto: localText })}
            rows={sessao.tipo === "PARAGRAFO" ? 4 : 2}
          />
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="text-destructive hover:text-destructive"
        onClick={onRemove}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
});

export default function ArticleEditor() {
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const slugCheckTimer = useRef<number | null>(null);

  const [form, setForm] = useState<FormData>({
    titulo: "",
    resumo: "",
    slug: "",
    capaUrl: "",
    categoria: "OUTROS",
    publicado: false,
    sessoes: [],
  });

  // Defensive: ensure every session has a stable _uid. This prevents accidental remounts
  // if some code path inserts a session without an _uid (protects against focus loss).
  useEffect(() => {
    if (!form.sessoes || form.sessoes.length === 0) return;
    const missing = form.sessoes.some((s) => !s._uid);
    if (!missing) return;
    setForm((prev) => ({
      ...prev,
      sessoes: prev.sessoes.map((s) =>
        s._uid ? s : { ...s, _uid: makeUid() },
      ),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.sessoes.length]);

  useEffect(() => {
    if (isEditing) {
      loadArticle();
    }
  }, [id]);

  const loadArticle = async () => {
    setIsLoading(true);
    try {
      const article = await api.getManageArticle(Number(id));
      if (article) {
        setForm({
          titulo: article.titulo,
          resumo: article.resumo || "",
          slug: article.slug || "",
          capaUrl: article.capaUrl || "",
          categoria: article.categoria,
          publicado: article.publicado,
          sessoes: (article.sessoes || []).map((s: LocalSessao, i: number) => ({
            _uid: s.id ? `db-${s.id}` : `${Date.now()}-${i}`,
            ordem: i,
            _imgSource:
              typeof s.imagemUrl === "string" && s.imagemUrl.startsWith("data:")
                ? "upload"
                : "url",
            ...s,
          })),
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao carregar artigo",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // internal UID for sortable items
  const makeUid = () =>
    `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const sensors = useSensors(useSensor(PointerSensor));
  const USE_DND = true;

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      setForm((prev) => {
        const oldIndex = prev.sessoes.findIndex((s) => s._uid === active.id);
        const newIndex = prev.sessoes.findIndex((s) => s._uid === over.id);
        if (oldIndex === -1 || newIndex === -1) return prev;
        const next = arrayMove(prev.sessoes, oldIndex, newIndex).map(
          (s: LocalSessao, i: number) => ({ ...s, ordem: i }),
        );
        return { ...prev, sessoes: next };
      });
    },
    [setForm],
  );

  const handleAddSection = (tipo: "PARAGRAFO" | "TOPICO" | "IMAGEM") => {
    setForm((prev) => ({
      ...prev,
      sessoes: [
        ...prev.sessoes,
        {
          _uid: makeUid(),
          ordem: prev.sessoes.length,
          tipo,
          texto: "",
          imagemUrl: "",
          _imgSource: "url",
        } as LocalSessao,
      ],
    }));
  };

  const updateSessao = useCallback(
    (uid: string, updates: Partial<LocalSessao>) => {
      setForm((prev) => ({
        ...prev,
        sessoes: prev.sessoes.map((s) => {
          if (s._uid !== uid) return s;
          const merged = { ...s, ...updates } as LocalSessao;
          // avoid returning a new object when nothing actually changed
          const noChange =
            (s.texto || "") === (merged.texto || "") &&
            (s.imagemUrl || "") === (merged.imagemUrl || "") &&
            (s._imgSource || "") === (merged._imgSource || "");
          return noChange ? s : merged;
        }),
      }));
    },
    [setForm],
  );

  const removeSessao = useCallback(
    (uid: string) => {
      setForm((prev) => ({
        ...prev,
        sessoes: prev.sessoes
          .filter((s) => s._uid !== uid)
          .map((s, i) => ({ ...s, ordem: i })),
      }));
    },
    [setForm],
  );

  const handleUpdateSection = useCallback(
    (index: number, updates: Partial<ArtigoSessao>) => {
      setForm((prev) => ({
        ...prev,
        sessoes: prev.sessoes.map((s, i) =>
          i === index ? { ...s, ...updates } : s,
        ),
      }));
    },
    [setForm],
  );

  const handleRemoveSection = useCallback(
    (index: number) => {
      setForm((prev) => ({
        ...prev,
        sessoes: prev.sessoes
          .filter((_, i) => i !== index)
          .map((s, i) => ({ ...s, ordem: i })),
      }));
    },
    [setForm],
  );

  const checkSlugNow = async (force = false) => {
    if (!form.slug || form.slug.trim() === "") {
      setSlugAvailable(null);
      return;
    }
    if (!force) {
      // debounce
      if (slugCheckTimer.current) window.clearTimeout(slugCheckTimer.current);
      slugCheckTimer.current = window.setTimeout(async () => {
        setCheckingSlug(true);
        try {
          const avail = await api.checkSlugAvailability(
            form.slug,
            isEditing ? Number(id) : undefined,
          );
          setSlugAvailable(avail);
        } catch (err) {
          setSlugAvailable(null);
        } finally {
          setCheckingSlug(false);
        }
      }, 500);
      return;
    }
    // immediate
    setCheckingSlug(true);
    try {
      const avail = await api.checkSlugAvailability(
        form.slug,
        isEditing ? Number(id) : undefined,
      );
      setSlugAvailable(avail);
    } catch (err) {
      setSlugAvailable(null);
    } finally {
      setCheckingSlug(false);
    }
  };

  const handleSubmit = async (publish: boolean = form.publicado) => {
    if (!form.titulo || form.titulo.length < 3) {
      toast({
        title: "O título deve ter pelo menos 3 caracteres",
        variant: "destructive",
      });
      return;
    }

    // when publishing, require at least one non-empty session
    if (
      publish &&
      (!form.sessoes ||
        form.sessoes.length === 0 ||
        form.sessoes.every(
          (s) =>
            (!s.texto || s.texto.trim() === "") &&
            (!s.imagemUrl || s.imagemUrl.trim() === ""),
        ))
    ) {
      toast({
        title:
          "Adicione ao menos uma seção com texto ou imagem antes de publicar",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const data = {
        titulo: form.titulo,
        slug: form.slug || undefined,
        resumo: form.resumo || undefined,
        capaUrl: form.capaUrl || undefined,
        categoria: form.categoria,
        publicado: publish,
        artigoSessoes: form.sessoes.map((s: LocalSessao, i: number) => {
          const { _uid, ...rest } = s;
          return { ...rest, ordem: i };
        }),
      };

      if (isEditing) {
        await api.updateArticle(Number(id), data);
        toast({ title: "Artigo atualizado com sucesso!" });
      } else {
        await api.createArticle(data);
        toast({ title: "Artigo criado com sucesso!" });
      }

      navigate("/dashboard/artigos");
    } catch (error) {
      toast({
        title: isEditing ? "Erro ao atualizar artigo" : "Erro ao criar artigo",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              placeholder="Digite o título da notícia"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="resumo">Resumo</Label>
            <Textarea
              id="resumo"
              value={form.resumo}
              onChange={(e) => setForm({ ...form, resumo: e.target.value })}
              placeholder="Um breve resumo da notícia (opcional)"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="slug">Slug (URL)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => {
                    setForm({ ...form, slug: e.target.value });
                    setSlugAvailable(null);
                    checkSlugNow();
                  }}
                  placeholder="slug-para-url (opcional)"
                  aria-invalid={slugAvailable === false}
                  className={cn(
                    slugAvailable === true
                      ? "!border-green-600 !ring-2 focus-visible:!ring-green-200"
                      : slugAvailable === false
                        ? "!border-red-600 !ring-2 focus-visible:!ring-red-200"
                        : "",
                  )}
                />
                <Button
                  size="sm"
                  onClick={() => checkSlugNow(true)}
                  disabled={checkingSlug}
                >
                  {checkingSlug ? "Verificando..." : "Verificar"}
                </Button>
              </div>
              {slugAvailable === true && (
                <p className="text-sm text-green-600 mt-1">disponível</p>
              )}
              {slugAvailable === false && (
                <p className="text-sm text-red-600 mt-1">indisponível</p>
              )}
              <Label htmlFor="capaUrl">URL da Capa</Label>
              <Input
                id="capaUrl"
                value={form.capaUrl}
                onChange={(e) => setForm({ ...form, capaUrl: e.target.value })}
                placeholder="https://... (opcional)"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoria">Categoria *</Label>
            <Select
              value={form.categoria}
              onValueChange={(v) =>
                setForm({ ...form, categoria: v as Categoria })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sessões do Artigo */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Sessões do Artigo</CardTitle>
              <CardDescription>
                Adicione parágrafos, tópicos ou imagens para enriquecer o
                artigo.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddSection("PARAGRAFO")}
              >
                <Plus className="h-4 w-4 mr-1" />
                Parágrafo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddSection("TOPICO")}
              >
                <Plus className="h-4 w-4 mr-1" />
                Tópico
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddSection("IMAGEM")}
              >
                <Image className="h-4 w-4 mr-1" />
                Imagem
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {form.sessoes.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Nenhuma seção adicionada ainda.
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={form.sessoes.map((s) => s._uid as string)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {form.sessoes.map((sessao, index) => (
                    <SortableSection
                      key={sessao._uid}
                      id={sessao._uid as string}
                      sessao={sessao}
                      index={index}
                      onUpdate={(u) => updateSessao(sessao._uid as string, u)}
                      onRemove={() => removeSessao(sessao._uid as string)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex gap-3">
              {/**
               * Creation: show Publish on the left, then "Salvar como Rascunho",
               * then "Salvar Rascunho e Pré Visualizar".
               *
               * Editing: do not show separate "Salvar como Rascunho" — instead
               * show a single toggle button that publishes or hides the article
               * (text + style depends on form.publicado). Preview remains.
               */}

              {isEditing ? (
                <>
                  {form.publicado ? (
                    <Button
                      variant="outline"
                      onClick={() => handleSubmit(false)}
                      disabled={isSaving}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ocultar
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleSubmit(true)}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Eye className="h-4 w-4 mr-2" />
                      )}
                      Publicar
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    onClick={async () => {
                      if (isSaving) return;

                      if (!form.titulo || form.titulo.length < 3) {
                        toast({
                          title:
                            "Salve o artigo antes de pré-visualizar (título curto)",
                          variant: "destructive",
                        });
                        return;
                      }

                      // if slug chosen and known to be unavailable, warn
                      if (form.slug && slugAvailable === false) {
                        toast({
                          title:
                            "Slug em uso. Escolha um slug diferente antes de pré-visualizar",
                          variant: "destructive",
                        });
                        return;
                      }

                      setIsSaving(true);
                      try {
                        const data = {
                          titulo: form.titulo,
                          slug: form.slug || undefined,
                          resumo: form.resumo || undefined,
                          capaUrl: form.capaUrl || undefined,
                          categoria: form.categoria,
                          publicado: false,
                          artigoSessoes: form.sessoes.map((s) => {
                            const { _uid, ...rest } = s;
                            return rest;
                          }),
                        };

                        // save current edits as draft before preview
                        await api.updateArticle(Number(id), data);
                        toast({ title: "Rascunho salvo para pré-visualizar" });
                        // ensure we have latest slug (may have been normalized)
                        const updated = await api.getManageArticle(Number(id));
                        navigate(`/dashboard/artigos/${updated.id}/editar`);
                        const to = `/noticias/${updated.slug}?preview=true`;
                        window.open(to, "_blank");
                        return;
                      } catch (err) {
                        toast({
                          title: "Erro ao salvar rascunho para pré-visualizar",
                          variant: "destructive",
                        });
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                  >
                    Pré-visualizar
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={() => handleSubmit(true)}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Eye className="h-4 w-4 mr-2" />
                    )}
                    Publicar
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => handleSubmit(false)}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Salvar como Rascunho
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={async () => {
                      if (isSaving) return;

                      if (!form.titulo || form.titulo.length < 3) {
                        toast({
                          title:
                            "Salve o artigo antes de pré-visualizar (título curto)",
                          variant: "destructive",
                        });
                        return;
                      }

                      // if slug chosen and known to be unavailable, warn
                      if (form.slug && slugAvailable === false) {
                        toast({
                          title:
                            "Slug em uso. Escolha um slug diferente antes de pré-visualizar",
                          variant: "destructive",
                        });
                        return;
                      }

                      setIsSaving(true);
                      try {
                        const data = {
                          titulo: form.titulo,
                          slug: form.slug || undefined,
                          resumo: form.resumo || undefined,
                          capaUrl: form.capaUrl || undefined,
                          categoria: form.categoria,
                          publicado: false,
                          artigoSessoes: form.sessoes.map(
                            (s: LocalSessao, i: number) => {
                              const { _uid, ...rest } = s;
                              return { ...rest, ordem: i };
                            },
                          ),
                        };

                        // not editing -> create draft then open preview
                        const created = await api.createArticle(data);
                        // set editing state so subsequent actions work
                        navigate(`/dashboard/artigos/${created.id}/editar`);
                        // open preview
                        const to = `/noticias/${created.slug}?preview=true`;
                        window.open(to, "_blank");
                      } catch (err) {
                        toast({
                          title: "Erro ao salvar rascunho para pré-visualizar",
                          variant: "destructive",
                        });
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                  >
                    Salvar Rascunho e Pré Visualizar
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
