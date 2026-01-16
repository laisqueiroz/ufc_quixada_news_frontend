import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Plus, Eye, Edit, MessageSquare, ThumbsUp } from 'lucide-react'
import { api, Artigo } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CategoryBadge } from '@/components/news/CategoryBadge'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function DashboardOverview() {
    const { user } = useAuth()
    const [articles, setArticles] = useState<Artigo[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [stats, setStats] = useState({
        total: 0,
        published: 0,
        drafts: 0,
    })

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            const response = await api.getManageArticles({ limite: 5 })
            setArticles(response.items)

            const published = response.items.filter((a) => a.publicado).length
            setStats({
                total: response.items.length,
                published,
                drafts: response.items.length - published,
            })
        } catch (error) {
            console.error('Failed to load dashboard data:', error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-serif font-bold text-foreground">
                        Olá, {user?.nome?.split(' ')[0]}! 👋
                    </h1>
                    <p className="text-muted-foreground">
                        Bem-vindo ao painel de gerenciamento do Jornal UFC.
                    </p>
                </div>
                <Button asChild>
                    <Link to="/dashboard/artigos/novo">
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Artigo
                    </Link>
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total de Artigos</CardDescription>
                        <CardTitle className="text-3xl">{stats.total}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <FileText className="h-4 w-4" />
                            Todos os seus artigos
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Publicados</CardDescription>
                        <CardTitle className="text-3xl text-success">{stats.published}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Eye className="h-4 w-4" />
                            Visíveis publicamente
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Rascunhos</CardDescription>
                        <CardTitle className="text-3xl text-warning">{stats.drafts}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Edit className="h-4 w-4" />
                            Aguardando publicação
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Articles */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Artigos Recentes</CardTitle>
                            <CardDescription>Seus últimos artigos criados</CardDescription>
                        </div>
                        <Button variant="outline" asChild>
                            <Link to="/dashboard/artigos">Ver todos</Link>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
                    ) : articles.length > 0 ? (
                        <div className="space-y-4">
                            {articles.map((article) => (
                                <div
                                    key={article.id}
                                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                                >
                                    <div className="flex-1 min-w-0 mr-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <CategoryBadge category={article.categoria} />
                                            {!article.publicado && (
                                                <span className="text-xs px-2 py-0.5 rounded bg-warning/10 text-warning border border-warning/20">
                                                    Rascunho
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="font-medium text-foreground truncate">
                                            {article.titulo}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            {article.publicadoEm
                                                ? format(
                                                      new Date(article.publicadoEm),
                                                      "d 'de' MMM, yyyy",
                                                      { locale: ptBR },
                                                  )
                                                : 'Não publicado'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
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
                                            <Link to={`/dashboard/artigos/${article.id}/editar`}>
                                                <Edit className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                            <p className="text-muted-foreground mb-4">
                                Você ainda não criou nenhum artigo.
                            </p>
                            <Button asChild>
                                <Link to="/dashboard/artigos/novo">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Criar primeiro artigo
                                </Link>
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
