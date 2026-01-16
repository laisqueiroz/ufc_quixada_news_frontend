import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, Eye, Edit, Trash2, Search, Loader2 } from 'lucide-react'
import { api, Artigo, Categoria } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { CategoryBadge } from '@/components/news/CategoryBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'

const categories: { value: Categoria | 'all'; label: string }[] = [
    { value: 'all', label: 'Todas as categorias' },
    { value: 'EVENTOS', label: 'Eventos' },
    { value: 'OPORTUNIDADES', label: 'Oportunidades' },
    { value: 'PESQUISA', label: 'Pesquisa' },
    { value: 'PROJETOS', label: 'Projetos' },
    { value: 'AVISOS', label: 'Avisos' },
    { value: 'OUTROS', label: 'Outros' },
]

export default function ArticlesList() {
    const [articles, setArticles] = useState<Artigo[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [categoryFilter, setCategoryFilter] = useState<Categoria | 'all'>('all')
    const [nextCursor, setNextCursor] = useState<number | null>(null)
    const { toast } = useToast()
    const { user } = useAuth()

    useEffect(() => {
        loadArticles()
    }, [categoryFilter])

    const loadArticles = async (cursor?: number) => {
        if (!cursor) {
            setIsLoading(true)
            setArticles([])
        }

        try {
            const response = await api.getManageArticles({
                limite: 10,
                cursor,
                categoria: categoryFilter === 'all' ? undefined : categoryFilter,
                busca: searchTerm || undefined,
            })

            if (cursor) {
                setArticles((prev) => [...prev, ...response.items])
            } else {
                setArticles(response.items)
            }
            setNextCursor(response.nextCursor || null)
        } catch (error) {
            toast({
                title: 'Erro ao carregar artigos',
                variant: 'destructive',
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleSearch = () => {
        loadArticles()
    }

    const handleDelete = async (id: number) => {
        try {
            await api.deleteArticle(id)
            setArticles((prev) => prev.filter((a) => a.id !== id))
            toast({ title: 'Artigo removido com sucesso!' })
        } catch (error) {
            toast({
                title: 'Erro ao remover artigo',
                variant: 'destructive',
            })
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-serif font-bold text-foreground">Meus Artigos</h1>
                    <p className="text-muted-foreground">Gerencie todos os seus artigos aqui.</p>
                </div>
                <Button asChild>
                    <Link to="/dashboard/artigos/novo">
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Artigo
                    </Link>
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 flex gap-2">
                    <Input
                        placeholder="Buscar por título..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        className="max-w-sm"
                    />
                    <Button variant="outline" onClick={handleSearch}>
                        <Search className="h-4 w-4" />
                    </Button>
                </div>
                <Select
                    value={categoryFilter}
                    onValueChange={(v) => setCategoryFilter(v as Categoria | 'all')}
                >
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Categoria" />
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

            {/* Table */}
            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : articles.length > 0 ? (
                <>
                    <div className="rounded-lg border bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Título</TableHead>
                                    <TableHead>Categoria</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Data</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {articles.map((article) => (
                                    <TableRow key={article.id}>
                                        <TableCell className="font-medium max-w-[300px] truncate">
                                            {article.titulo}
                                        </TableCell>
                                        <TableCell>
                                            <CategoryBadge category={article.categoria} />
                                        </TableCell>
                                        <TableCell>
                                            {article.publicado ? (
                                                <span className="text-xs px-2 py-1 rounded bg-success/10 text-success">
                                                    Publicado
                                                </span>
                                            ) : (
                                                <span className="text-xs px-2 py-1 rounded bg-warning/10 text-warning">
                                                    Rascunho
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {article.publicadoEm
                                                ? format(
                                                      new Date(article.publicadoEm),
                                                      'dd/MM/yyyy',
                                                      { locale: ptBR },
                                                  )
                                                : '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="icon" asChild>
                                                    {(() => {
                                                        const allowed = [
                                                            'ADMINISTRADOR',
                                                            'BOLSISTA',
                                                            'PROFESSOR',
                                                            'TECNICO_ADMINISTRATIVO',
                                                        ]
                                                        const canPreview =
                                                            !article.publicado &&
                                                            user &&
                                                            allowed.includes(user.papel as string)
                                                        const to = `/noticias/${article.slug}${
                                                            canPreview ? '?preview=true' : ''
                                                        }`
                                                        return (
                                                            <Link to={to}>
                                                                <Eye className="h-4 w-4" />
                                                            </Link>
                                                        )
                                                    })()}
                                                </Button>
                                                <Button variant="ghost" size="icon" asChild>
                                                    <Link
                                                        to={`/dashboard/artigos/${article.id}/editar`}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-destructive hover:text-destructive"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>
                                                                Remover artigo?
                                                            </AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Esta ação não pode ser desfeita. O
                                                                artigo será permanentemente
                                                                removido.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>
                                                                Cancelar
                                                            </AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() =>
                                                                    handleDelete(article.id)
                                                                }
                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            >
                                                                Remover
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {nextCursor && (
                        <div className="text-center">
                            <Button variant="outline" onClick={() => loadArticles(nextCursor)}>
                                Carregar mais
                            </Button>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center py-12 bg-card rounded-lg border">
                    <p className="text-muted-foreground mb-4">Nenhum artigo encontrado.</p>
                    <Button asChild>
                        <Link to="/dashboard/artigos/novo">
                            <Plus className="h-4 w-4 mr-2" />
                            Criar artigo
                        </Link>
                    </Button>
                </div>
            )}
        </div>
    )
}
