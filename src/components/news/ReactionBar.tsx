import { useState, useEffect, useRef } from 'react'
import { Heart, ThumbsUp, Frown, Sparkles, Award } from 'lucide-react'
import { api, TipoReacao } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface ReactionBarProps {
    articleId: number
    initialReactions?: Record<TipoReacao, number>
}

const reactionConfig: Record<
    TipoReacao,
    { icon: React.ComponentType<{ className?: string }>; label: string; color: string }
> = {
    CURTIDA: { icon: ThumbsUp, label: 'Curtir', color: 'text-blue-500 hover:text-blue-600' },
    AMEI: { icon: Heart, label: 'Amei', color: 'text-red-500 hover:text-red-600' },
    TRISTE: { icon: Frown, label: 'Triste', color: 'text-slate-500 hover:text-slate-600' },
    SURPRESO: { icon: Sparkles, label: 'Surpreso', color: 'text-amber-500 hover:text-amber-600' },
    PARABENS: { icon: Award, label: 'Parabéns', color: 'text-emerald-500 hover:text-emerald-600' },
}

export function ReactionBar({ articleId, initialReactions }: ReactionBarProps) {
    const [reactions, setReactions] = useState<Record<TipoReacao, number>>(
        initialReactions || {
            CURTIDA: 0,
            AMEI: 0,
            TRISTE: 0,
            SURPRESO: 0,
            PARABENS: 0,
        },
    )
    const [userReaction, setUserReaction] = useState<{
        id: number | null
        tipo: TipoReacao | null
    }>({ id: null, tipo: null })
    const [isLoading, setIsLoading] = useState(false)
    const [userReactionLoaded, setUserReactionLoaded] = useState(false)
    const inFlight = useRef(false)
    const { isAuthenticated } = useAuth()
    const { toast } = useToast()

    const loadReactions = async () => {
        try {
            const data = await api.getReactions(articleId)
            // Normalize server response so missing reaction types are treated as 0
            const normalized = (Object.keys(reactionConfig) as TipoReacao[]).reduce((acc, t) => {
                const value = data && typeof (data as any)[t] === 'number' ? (data as any)[t] : 0
                acc[t] = value
                return acc
            }, {} as Record<TipoReacao, number>)
            setReactions(normalized)
        } catch (error) {
            console.error('Failed to load reactions:', error)
        }
    }

    useEffect(() => {
        // load counts first; user reaction is loaded by the auth-aware effect below
        loadReactions()
    }, [articleId])

    useEffect(() => {
        // if authentication state changes (e.g., user logs in after page load), fetch the user's reaction
        // avoid re-running if we already loaded the user's reaction
        if (isAuthenticated && !userReactionLoaded) {
            // attempt a couple times in case token/user context isn't ready yet
            let attempts = 0
            let timer: ReturnType<typeof setTimeout> | null = null
            let active = true
            const tryLoad = async () => {
                attempts += 1
                await loadUserReaction()
                if (active && !userReactionLoaded && attempts < 3) {
                    // small backoff
                    timer = setTimeout(tryLoad, 300 * attempts)
                }
            }
            tryLoad()
            return () => {
                active = false
                if (timer) clearTimeout(timer)
            }
        } else if (!isAuthenticated) {
            // not authenticated -> reset
            setUserReaction({ id: null, tipo: null })
            setUserReactionLoaded(true)
        }
    }, [isAuthenticated, articleId, userReactionLoaded])

    const loadUserReaction = async () => {
        try {
            const data = await api.getMyReaction(articleId)
            // data normalized to { id, tipo }
            if (!data) setUserReaction({ id: null, tipo: null })
            else setUserReaction({ id: (data as any).id ?? null, tipo: (data as any).tipo ?? null })
        } catch (error) {
            setUserReaction({ id: null, tipo: null })
        } finally {
            setUserReactionLoaded(true)
        }
    }

    const handleReaction = async (tipo: TipoReacao) => {
        if (!isAuthenticated) {
            toast({
                title: 'Faça login para reagir',
                description: 'Você precisa estar logado para reagir às notícias.',
                variant: 'destructive',
            })
            return
        }

        if (!userReactionLoaded) {
            // conservative: do not allow action until we know current user reaction
            toast({
                title: 'Aguardando estado',
                description:
                    'Aguardando verificação da sua reação. Tente novamente em alguns instantes.',
            })
            return
        }

        // Synchronous guard to prevent concurrent requests
        if (inFlight.current) return
        inFlight.current = true

        setIsLoading(true)
        try {
            if (userReaction.tipo === tipo) {
                // remove: prefer deletion by id when available
                if (userReaction.id) {
                    await api.deleteReactionById(articleId, userReaction.id)
                } else {
                    await api.deleteReaction(articleId)
                }
            } else {
                // create or update
                await api.createReaction(articleId, tipo)
            }

            // re-sync authoritative state from server
            await loadReactions()
            if (isAuthenticated) await loadUserReaction()
        } catch (error) {
            toast({
                title: 'Erro ao reagir',
                description: 'Não foi possível registrar sua reação. Tente novamente.',
                variant: 'destructive',
            })
        } finally {
            inFlight.current = false
            setIsLoading(false)
        }
    }

    return (
        <div className="flex flex-wrap gap-2">
            {(Object.keys(reactionConfig) as TipoReacao[]).map((tipo) => {
                const config = reactionConfig[tipo]
                const Icon = config.icon
                const count = reactions[tipo] || 0
                const isActive = userReaction.tipo === tipo

                return (
                    <Button
                        key={tipo}
                        aria-label={config.label}
                        data-tipo={tipo}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReaction(tipo)}
                        disabled={isLoading || (isAuthenticated && !userReactionLoaded)}
                        className={cn(
                            'reaction-btn gap-1.5 h-9 px-3',
                            config.color,
                            isActive && 'bg-muted',
                        )}
                    >
                        <Icon className={cn('h-4 w-4', isActive && 'fill-current')} />
                        <span className="text-foreground">{count}</span>
                    </Button>
                )
            })}
        </div>
    )
}
