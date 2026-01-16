import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { api, Artigo, Categoria } from '@/lib/api'
import { NewsCard } from '@/components/news/NewsCard'
import { SearchFilters } from '@/components/news/SearchFilters'
import { Button } from '@/components/ui/button'

export default function SearchPage() {
    const [searchParams, setSearchParams] = useSearchParams()
    const [articles, setArticles] = useState<Artigo[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [nextCursor, setNextCursor] = useState<number | null>(null)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [searchQuery, setSearchQuery] = useState<{
        busca?: string
        categoria?: Categoria
        dataInicial?: string
        dataFinal?: string
    }>({})

    // helper to convert incoming ISO to start/end of day ISO in local time
    const toStartOfDayIso = (iso?: string) => {
        if (!iso) return undefined
        const d = new Date(iso)
        d.setHours(0, 0, 0, 0)
        return d.toISOString()
    }
    const toEndOfDayIso = (iso?: string) => {
        if (!iso) return undefined
        const d = new Date(iso)
        d.setHours(23, 59, 59, 999)
        return d.toISOString()
    }

    useEffect(() => {
        // load initial values from query params (if present)
        const categoria = (searchParams.get('categoria') as Categoria) || undefined
        const busca = searchParams.get('busca') || undefined
        const dataInicialRaw = searchParams.get('dataInicial') || undefined
        const dataFinalRaw = searchParams.get('dataFinal') || undefined

        const dataInicial = toStartOfDayIso(dataInicialRaw)
        const dataFinal = toEndOfDayIso(dataFinalRaw)

        const initial: any = { ...(busca ? { busca } : {}), ...(categoria ? { categoria } : {}) }
        if (dataInicial) initial.dataInicial = dataInicial
        if (dataFinal) initial.dataFinal = dataFinal

        setSearchQuery(initial)

        // load news with the initial params
        loadNews(initial)
    }, [searchParams])

    const loadNews = async (params?: {
        busca?: string
        categoria?: Categoria
        dataInicial?: string
        dataFinal?: string
        cursor?: number
    }) => {
        if (params?.cursor) {
            setIsLoadingMore(true)
        } else {
            setIsLoading(true)
            setArticles([])
        }

        try {
            const response = await api.getNews({
                limite: 9,
                ...params,
            })

            if (params?.cursor) {
                setArticles((prev) => [...prev, ...response.items])
            } else {
                setArticles(response.items)
            }
            setNextCursor(response.nextCursor || null)
        } catch (error) {
            console.error('Failed to load news:', error)
        } finally {
            setIsLoading(false)
            setIsLoadingMore(false)
        }
    }

    const handleSearch = (params: {
        busca?: string
        categoria?: Categoria
        dataInicial?: string
        dataFinal?: string
    }) => {
        // normalize dates to start/end of day in local time
        const normalized: any = { ...(params.busca ? { busca: params.busca } : {}) }
        if (params.categoria) normalized.categoria = params.categoria
        if (params.dataInicial) normalized.dataInicial = toStartOfDayIso(params.dataInicial)
        if (params.dataFinal) normalized.dataFinal = toEndOfDayIso(params.dataFinal)

        // update URL query params to persist filters
        const qp: Record<string, string> = {}
        if (normalized.busca) qp.busca = normalized.busca
        if (normalized.categoria) qp.categoria = normalized.categoria
        if (normalized.dataInicial) qp.dataInicial = normalized.dataInicial
        if (normalized.dataFinal) qp.dataFinal = normalized.dataFinal
        setSearchParams(qp)

        setSearchQuery(normalized)
        loadNews(normalized)
    }

    const handleLoadMore = () => {
        if (nextCursor) {
            loadNews({ ...searchQuery, cursor: nextCursor })
        }
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <section className="py-12 bg-muted/30 border-b border-border">
                <div className="container">
                    <h1 className="text-3xl font-serif font-bold text-foreground mb-2">
                        Buscar Notícias
                    </h1>
                    <p className="text-muted-foreground mb-8">
                        Encontre notícias por palavras-chave, categoria ou período.
                    </p>
                    <SearchFilters
                        onSearch={handleSearch}
                        isLoading={isLoading}
                        initialBusca={searchQuery.busca}
                        initialCategoria={searchQuery.categoria}
                        initialDataInicial={searchQuery.dataInicial}
                        initialDataFinal={searchQuery.dataFinal}
                    />
                </div>
            </section>

            {/* Results */}
            <section className="py-12">
                <div className="container">
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : articles.length > 0 ? (
                        <>
                            <p className="text-sm text-muted-foreground mb-6">
                                {articles.length} notícia(s) encontrada(s)
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {articles.map((article) => (
                                    <NewsCard key={article.id} article={article} />
                                ))}
                            </div>

                            {nextCursor && (
                                <div className="mt-8 text-center">
                                    <Button
                                        onClick={handleLoadMore}
                                        disabled={isLoadingMore}
                                        size="lg"
                                        variant="outline"
                                    >
                                        {isLoadingMore ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Carregando...
                                            </>
                                        ) : (
                                            'Carregar mais'
                                        )}
                                    </Button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-16">
                            <p className="text-xl text-muted-foreground mb-4">
                                Nenhuma notícia encontrada
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Tente ajustar os filtros ou usar outras palavras-chave.
                            </p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    )
}
