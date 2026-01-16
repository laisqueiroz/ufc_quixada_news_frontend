import { useState, useEffect, useRef } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

type TipoComentario = 'GOSTEI' | 'NAO_GOSTEI'

export function CommentReactionBar({
    articleId,
    commentId,
}: {
    articleId: number
    commentId: number
}) {
    const [counts, setCounts] = useState<Record<TipoComentario, number>>({
        GOSTEI: 0,
        NAO_GOSTEI: 0,
    })
    const [me, setMe] = useState<{ id: number | null; tipo: TipoComentario | null }>({
        id: null,
        tipo: null,
    })
    const [loaded, setLoaded] = useState(false)
    const [loading, setLoading] = useState(false)
    const inFlight = useRef(false)
    const { isAuthenticated } = useAuth()
    const { toast } = useToast()

    const loadCounts = async () => {
        try {
            const data = await api.getCommentReactions(articleId, commentId)
            if (!data) {
                setCounts({ GOSTEI: 0, NAO_GOSTEI: 0 })
                return
            }
            const gostei = Number((data['GOSTEI'] as number) ?? 0) || 0
            const nao = Number((data['NAO_GOSTEI'] as number) ?? 0) || 0
            setCounts({ GOSTEI: gostei, NAO_GOSTEI: nao })
        } catch (e) {
            console.error('Failed to load comment reactions', e)
        }
    }

    useEffect(() => {
        loadCounts()
    }, [articleId, commentId])

    useEffect(() => {
        let attempts = 0
        let timer: ReturnType<typeof setTimeout> | null = null
        let active = true
        const tryLoad = async () => {
            attempts += 1
            await loadMy()
            if (active && !loaded && attempts < 3) timer = setTimeout(tryLoad, 300 * attempts)
        }
        if (isAuthenticated && !loaded) tryLoad()
        else if (!isAuthenticated) {
            setMe({ id: null, tipo: null })
            setLoaded(true)
        }
        return () => {
            active = false
            if (timer) clearTimeout(timer)
        }
    }, [isAuthenticated, articleId, commentId, loaded])

    const loadMy = async () => {
        try {
            const data = await api.getMyCommentReaction(articleId, commentId)
            setMe({ id: data?.id ?? null, tipo: (data?.tipo as TipoComentario) ?? null })
        } catch (e) {
            setMe({ id: null, tipo: null })
        } finally {
            setLoaded(true)
        }
    }

    const handle = async (tipo: TipoComentario) => {
        if (!isAuthenticated) {
            toast({
                title: 'Faça login para reagir',
                description: 'Você precisa estar logado para reagir.',
                variant: 'destructive',
            })
            return
        }
        if (!loaded) {
            toast({
                title: 'Aguardando estado',
                description: 'Verificando sua reação. Tente novamente.',
                variant: 'destructive',
            })
            return
        }
        if (inFlight.current) return
        inFlight.current = true
        setLoading(true)
        try {
            if (me.tipo === tipo) {
                if (me.id) await api.deleteCommentReactionById(articleId, commentId, me.id)
                else await api.deleteCommentReaction(articleId, commentId)
            } else {
                await api.createCommentReaction(articleId, commentId, tipo)
            }
            await loadCounts()
            if (isAuthenticated) await loadMy()
        } catch (e) {
            toast({
                title: 'Erro',
                description: 'Não foi possível registrar sua reação.',
                variant: 'destructive',
            })
        } finally {
            inFlight.current = false
            setLoading(false)
        }
    }

    return (
        <div className="flex gap-2 mt-2">
            <Button
                variant="ghost"
                size="sm"
                onClick={() => handle('GOSTEI')}
                disabled={loading || (isAuthenticated && !loaded)}
                className={cn(
                    'reaction-btn gap-1.5 h-8 px-2 text-blue-500 hover:text-blue-600',
                    me.tipo === 'GOSTEI' && 'bg-muted',
                )}
                aria-label="Gostei"
            >
                <ThumbsUp className={cn('h-4 w-4', me.tipo === 'GOSTEI' && 'fill-current')} />
                <span className="text-foreground">{counts.GOSTEI}</span>
            </Button>

            <Button
                variant="ghost"
                size="sm"
                onClick={() => handle('NAO_GOSTEI')}
                disabled={loading || (isAuthenticated && !loaded)}
                className={cn(
                    'reaction-btn gap-1.5 h-8 px-2 text-red-500 hover:text-red-600',
                    me.tipo === 'NAO_GOSTEI' && 'bg-muted',
                )}
                aria-label="Não gostei"
            >
                <ThumbsDown className={cn('h-4 w-4', me.tipo === 'NAO_GOSTEI' && 'fill-current')} />
                <span className="text-foreground">{counts.NAO_GOSTEI}</span>
            </Button>
        </div>
    )
}
