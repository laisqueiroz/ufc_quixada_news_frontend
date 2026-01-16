import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar, ArrowLeft, User, Share2 } from 'lucide-react'
import { api, Artigo } from '@/lib/api'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { CategoryBadge } from '@/components/news/CategoryBadge'
import { ReactionBar } from '@/components/news/ReactionBar'
import { CommentSection } from '@/components/news/CommentSection'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'

export default function ArticlePage() {
    const { slug } = useParams<{ slug: string }>()
    const [article, setArticle] = useState<Artigo | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const { toast } = useToast()

    const [searchParams] = useSearchParams()
    const { user, isLoading: authLoading } = useAuth()

    useEffect(() => {
        if (!slug) return
        const preview = searchParams.get('preview') === 'true'
        // If preview requested but auth is still loading, wait until auth finished
        if (preview && authLoading) return
        loadArticle(slug, preview)
    }, [slug, searchParams, user, authLoading])

    const loadArticle = async (articleSlug: string, preview = false) => {
        setIsLoading(true)
        setError(null)
        try {
            let data: Artigo
            if (
                preview &&
                user &&
                ['ADMINISTRADOR', 'BOLSISTA', 'PROFESSOR', 'TECNICO_ADMINISTRATIVO'].includes(
                    user.papel,
                )
            ) {
                data = await api.getNewsPreviewBySlug(articleSlug)
            } else {
                data = await api.getNewsBySlug(articleSlug)
            }
            setArticle(data)
        } catch (err) {
            setError('Notícia não encontrada')
        } finally {
            setIsLoading(false)
        }
    }

    const handleShare = async () => {
        try {
            await navigator.share({
                title: article?.titulo,
                url: window.location.href,
            })
        } catch {
            await navigator.clipboard.writeText(window.location.href)
            toast({ title: 'Link copiado!' })
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background">
                <div className="container py-8">
                    <Skeleton className="h-6 w-32 mb-6" />
                    <Skeleton className="h-10 w-3/4 mb-4" />
                    <Skeleton className="h-4 w-48 mb-8" />
                    <Skeleton className="h-[400px] w-full rounded-lg mb-8" />
                    <div className="space-y-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                    </div>
                </div>
            </div>
        )
    }

    if (error || !article) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-serif font-bold text-foreground mb-4">
                        {error || 'Notícia não encontrada'}
                    </h1>
                    <Button asChild>
                        <Link to="/">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Voltar ao início
                        </Link>
                    </Button>
                </div>
            </div>
        )
    }

    const imageUrl = article.capaUrl || article.sessoes?.find((s) => s.tipo === 'IMAGEM')?.imagemUrl
    const formattedDate = article.publicadoEm
        ? format(new Date(article.publicadoEm), "d 'de' MMMM 'de' yyyy, 'às' HH:mm", {
              locale: ptBR,
          })
        : ''

    return (
        <div className="min-h-screen bg-background">
            {/* Breadcrumb */}
            <div className="border-b border-border bg-muted/30">
                <div className="container py-4">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Voltar às notícias
                    </Link>
                </div>
            </div>

            {/* Article Header */}
            <article className="container py-8 max-w-4xl">
                {/* Featured Image */}
                {imageUrl && (
                    <div className="mb-8 rounded-lg overflow-hidden">
                        <img
                            src={imageUrl}
                            alt={article.titulo}
                            className="w-full h-auto object-cover"
                        />
                    </div>
                )}
                <header className="mb-8">
                    <CategoryBadge category={article.categoria} className="mb-4" />
                    <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4 text-balance">
                        {article.titulo}
                    </h1>

                    {article.resumo && (
                        <p className="text-lg text-muted-foreground mb-6">{article.resumo}</p>
                    )}

                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                                <Calendar className="h-4 w-4" />
                                {formattedDate}
                            </span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleShare}>
                            <Share2 className="h-4 w-4 mr-2" />
                            Compartilhar
                        </Button>
                    </div>
                </header>

                {/* Article Content */}
                <div className="prose prose-lg max-w-none mb-8">
                    {article.sessoes?.map((sessao, index) => {
                        if (sessao.tipo === 'PARAGRAFO') {
                            return (
                                <p key={index} className="text-foreground leading-relaxed mb-4">
                                    {sessao.texto}
                                </p>
                            )
                        }
                        if (sessao.tipo === 'TOPICO') {
                            return (
                                <li key={index} className="text-foreground ml-6 mb-2">
                                    {sessao.texto}
                                </li>
                            )
                        }
                        if (sessao.tipo === 'IMAGEM' && sessao.imagemUrl && index > 0) {
                            return (
                                <figure key={index} className="my-8">
                                    <img
                                        src={sessao.imagemUrl}
                                        alt=""
                                        className="w-full h-auto rounded-lg"
                                    />
                                    {sessao.texto && (
                                        <figcaption className="text-sm text-muted-foreground text-center mt-2">
                                            {sessao.texto}
                                        </figcaption>
                                    )}
                                </figure>
                            )
                        }
                        return null
                    })}
                </div>

                <Separator className="my-8" />

                {/* Reactions & Comments (disabled in preview/rascunho) */}
                {(!searchParams.get('preview') || searchParams.get('preview') !== 'true') &&
                article.publicado ? (
                    <>
                        <div className="mb-8">
                            <h3 className="text-lg font-serif font-bold text-foreground mb-4">
                                O que você achou?
                            </h3>
                            <ReactionBar
                                articleId={article.id}
                                initialReactions={article.reacoes}
                            />
                        </div>

                        <Separator className="my-8" />

                        <CommentSection articleId={article.id} />
                    </>
                ) : (
                    <div className="mb-8">
                        <p className="text-sm text-muted-foreground">
                            Pré-visualização/rascunho — reações e comentários desativados
                        </p>
                    </div>
                )}
            </article>
        </div>
    )
}
