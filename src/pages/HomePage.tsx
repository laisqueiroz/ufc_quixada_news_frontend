import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, TrendingUp, Users, BookOpen } from 'lucide-react'
import { api, Artigo, Categoria } from '@/lib/api'
import { NewsCard } from '@/components/news/NewsCard'
import { CategoryBadge } from '@/components/news/CategoryBadge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

const categories: Categoria[] = [
    'EVENTOS',
    'OPORTUNIDADES',
    'PESQUISA',
    'PROJETOS',
    'AVISOS',
    'OUTROS',
]

export default function HomePage() {
    const [featuredArticle, setFeaturedArticle] = useState<Artigo | null>(null)
    const [latestArticles, setLatestArticles] = useState<Artigo[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        loadNews()
    }, [])

    const loadNews = async () => {
        try {
            const response = await api.getNews({ limite: 7 })
            if (response.items.length > 0) {
                setFeaturedArticle(response.items[0])
                setLatestArticles(response.items.slice(1))
            }
        } catch (error) {
            console.error('Failed to load news:', error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen">
            {/* Hero Section */}
            <section className="gradient-hero text-white py-16 md:py-24">
                <div className="container">
                    <div className="max-w-3xl">
                        <h1 className="text-3xl md:text-5xl font-serif font-bold mb-4">
                            Jornal UFC Quixadá
                        </h1>
                        <p className="text-lg md:text-xl text-white/90 mb-6">
                            Fique por dentro das últimas notícias, eventos e oportunidades do Campus
                            Quixadá da Universidade Federal do Ceará.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <Button
                                asChild
                                size="lg"
                                className="bg-accent text-accent-foreground hover:bg-accent/90"
                            >
                                <Link to="/buscar">
                                    Explorar Notícias
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-8 border-b border-border bg-card">
                <div className="container">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                <TrendingUp className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-foreground">+500</p>
                                <p className="text-sm text-muted-foreground">Notícias Publicadas</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Users className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-foreground">+2000</p>
                                <p className="text-sm text-muted-foreground">Usuários Ativos</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                <BookOpen className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-foreground">6</p>
                                <p className="text-sm text-muted-foreground">
                                    Categorias de Conteúdo
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Categories */}
            <section className="py-8 bg-background">
                <div className="container">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-serif font-bold text-foreground">Categorias</h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {categories.map((cat) => (
                            <Link
                                key={cat}
                                to={`/buscar?categoria=${cat}`}
                                className="transition-transform hover:scale-105"
                            >
                                <CategoryBadge
                                    category={cat}
                                    className="cursor-pointer text-sm px-4 py-1.5"
                                />
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* Featured Article */}
            {isLoading ? (
                <section className="py-8 bg-background">
                    <div className="container">
                        <Skeleton className="h-8 w-48 mb-6" />
                        <Skeleton className="h-[400px] w-full rounded-lg" />
                    </div>
                </section>
            ) : (
                featuredArticle && (
                    <section className="py-8 bg-background">
                        <div className="container">
                            <h2 className="text-xl font-serif font-bold text-foreground mb-6">
                                Destaque
                            </h2>
                            <NewsCard article={featuredArticle} variant="featured" />
                        </div>
                    </section>
                )
            )}

            {/* Latest News */}
            <section className="py-12 bg-muted/30">
                <div className="container">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-serif font-bold text-foreground">
                            Últimas Notícias
                        </h2>
                        <Button variant="ghost" asChild>
                            <Link to="/buscar" className="flex items-center gap-2">
                                Ver todas
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </Button>
                    </div>

                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="space-y-3">
                                    <Skeleton className="h-48 w-full rounded-lg" />
                                    <Skeleton className="h-4 w-20" />
                                    <Skeleton className="h-6 w-full" />
                                    <Skeleton className="h-4 w-3/4" />
                                </div>
                            ))}
                        </div>
                    ) : latestArticles.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {latestArticles.map((article) => (
                                <NewsCard key={article.id} article={article} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-muted-foreground">Nenhuma notícia encontrada.</p>
                        </div>
                    )}

                    {latestArticles.length > 0 && (
                        <div className="mt-8 text-center">
                            <Button asChild size="lg">
                                <Link to="/buscar">
                                    Ver mais notícias
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
                    )}
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-16 bg-primary text-primary-foreground">
                <div className="container text-center">
                    <h2 className="text-2xl md:text-3xl font-serif font-bold mb-4">
                        Faça parte da comunidade
                    </h2>
                    <p className="text-lg text-primary-foreground/90 mb-6 max-w-2xl mx-auto">
                        Cadastre-se para comentar, reagir e interagir com as notícias. Se você é
                        docente, servidor ou bolsista, também pode publicar suas próprias notícias!
                    </p>
                    <div className="flex justify-center gap-4 flex-wrap">
                        <Button asChild size="lg" variant="secondary">
                            <Link to="/auth?tab=register">Criar Conta</Link>
                        </Button>
                        <Button
                            asChild
                            size="lg"
                            className="border-2 border-blue-900 hover:border-blue-900 hover:bg-blue-900/80 hover:text-white transition-colors"
                        >
                            <Link to="/auth">Já tenho conta</Link>
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    )
}
