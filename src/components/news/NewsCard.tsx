import { Link } from 'react-router-dom'
import { Calendar, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Artigo } from '@/lib/api'
import { CategoryBadge } from './CategoryBadge'
import { Card, CardContent, CardFooter } from '@/components/ui/card'

interface NewsCardProps {
    article: Artigo
    variant?: 'default' | 'featured'
}

export function NewsCard({ article, variant = 'default' }: NewsCardProps) {
    const imageUrl =
        article.capaUrl ||
        article.sessoes?.find((s) => s.tipo === 'IMAGEM')?.imagemUrl ||
        '/placeholder.svg'

    const formattedDate = article.publicadoEm
        ? format(new Date(article.publicadoEm), "d 'de' MMMM, yyyy", { locale: ptBR })
        : ''

    if (variant === 'featured') {
        return (
            <Link to={`/noticias/${article.slug}`} className="group block">
                <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <div className="grid md:grid-cols-2">
                        <div className="relative aspect-[4/3] md:aspect-auto overflow-hidden">
                            <img
                                src={imageUrl}
                                alt={article.titulo}
                                className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent md:hidden" />
                        </div>
                        <CardContent className="flex flex-col justify-center p-6 md:p-8">
                            <CategoryBadge category={article.categoria} className="w-fit mb-3" />
                            <h2 className="text-xl md:text-2xl font-serif font-bold text-foreground group-hover:text-primary transition-colors mb-3 line-clamp-2">
                                {article.titulo}
                            </h2>
                            <p className="text-muted-foreground text-sm md:text-base line-clamp-3 mb-4">
                                {article.resumo ||
                                    article.sessoes?.find((s) => s.tipo === 'PARAGRAFO' && s.texto)
                                        ?.texto ||
                                    ''}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1.5">
                                    <Calendar className="h-4 w-4" />
                                    {formattedDate}
                                </span>
                            </div>
                            <div className="mt-4 flex items-center gap-2 text-primary font-medium text-sm group-hover:gap-3 transition-all">
                                Ler mais <ArrowRight className="h-4 w-4" />
                            </div>
                        </CardContent>
                    </div>
                </Card>
            </Link>
        )
    }

    return (
        <Link to={`/noticias/${article.slug}`} className="group block">
            <Card className="overflow-hidden h-full hover:shadow-lg transition-shadow duration-300 border-border/50">
                <div className="relative aspect-[16/10] overflow-hidden">
                    <img
                        src={imageUrl}
                        alt={article.titulo}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                    />
                </div>
                <CardContent className="p-4">
                    <CategoryBadge category={article.categoria} className="mb-3" />
                    <h3 className="font-serif font-bold text-foreground group-hover:text-primary transition-colors mb-2 line-clamp-2">
                        {article.titulo}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {article.resumo ||
                            article.sessoes?.find((s) => s.tipo === 'PARAGRAFO' && s.texto)
                                ?.texto ||
                            ''}
                    </p>
                </CardContent>
                <CardFooter className="px-4 pb-4 pt-0">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        {formattedDate}
                    </span>
                </CardFooter>
            </Card>
        </Link>
    )
}
