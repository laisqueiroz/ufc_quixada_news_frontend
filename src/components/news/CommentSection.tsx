import { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Send, Edit2, Trash2, Reply, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { api, Comentario } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { CommentReactionBar } from './CommentReactionBar'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface CommentSectionProps {
    articleId: number
}

function CommentItem({
    comment,
    articleId,
    onReply,
    onUpdate,
    onDelete,
    depth = 0,
    getAuthorLoginById,
}: {
    comment: Comentario
    articleId: number
    onReply: (parentId: number) => void
    onUpdate: () => void
    onDelete: (id: number) => void
    depth?: number
    getAuthorLoginById?: (id: number | null) => string | null
}) {
    const { user, isAuthenticated } = useAuth()
    const [isEditing, setIsEditing] = useState(false)
    const [editContent, setEditContent] = useState(comment.conteudo)
    const { toast } = useToast()

    const isOwner = user?.id === comment.autor.id
    const canDelete = isOwner || user?.papel === 'ADMINISTRADOR'

    const handleSaveEdit = async () => {
        if (editContent.length < 10 || editContent.length > 500) {
            toast({
                title: 'Comentário inválido',
                description: 'O comentário deve ter entre 10 e 500 caracteres.',
                variant: 'destructive',
            })
            return
        }

        try {
            await api.updateComment(comment.id, editContent)
            setIsEditing(false)
            onUpdate()
            toast({ title: 'Comentário atualizado!' })
        } catch (error) {
            toast({
                title: 'Erro ao atualizar',
                description: 'Não foi possível atualizar o comentário.',
                variant: 'destructive',
            })
        }
    }

    return (
        <div className={cn('space-y-3', depth > 0 && 'ml-6 pl-4 border-l-2 border-border')}>
            <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                            <span className="text-sm font-semibold text-primary-foreground">
                                {comment.autor.nome.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-foreground">
                                {comment.autor.nome}
                            </p>
                            <p className="text-xs text-muted-foreground">@{comment.autor.login}</p>
                        </div>
                    </div>
                    {isAuthenticated && (
                        <div className="flex items-center gap-1">
                            {isOwner && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => setIsEditing(!isEditing)}
                                >
                                    {isEditing ? (
                                        <X className="h-3.5 w-3.5" />
                                    ) : (
                                        <Edit2 className="h-3.5 w-3.5" />
                                    )}
                                </Button>
                            )}
                            {canDelete && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={() => onDelete(comment.id)}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => onReply(comment.id)}
                                aria-label={`Responder @${comment.autor.login}`}
                                title={`Responder @${comment.autor.login}`}
                            >
                                <Reply className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    )}
                </div>

                {isEditing ? (
                    <div className="space-y-2">
                        <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="min-h-[80px]"
                        />
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                                Cancelar
                            </Button>
                            <Button size="sm" onClick={handleSaveEdit}>
                                Salvar
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div>
                        {comment.respondeAId && getAuthorLoginById ? (
                            <p className="text-xs text-muted-foreground">
                                Em resposta a @{getAuthorLoginById(comment.respondeAId)}
                            </p>
                        ) : null}
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                            {comment.conteudo}
                        </p>

                        {/* Comment reaction bar */}
                        <div className="mt-2">
                            <CommentReactionBar articleId={articleId} commentId={comment.id} />
                        </div>
                    </div>
                )}
            </div>

            {/* Nested replies */}
            {comment.respostas && comment.respostas.length > 0 && (
                <div className="space-y-3">
                    {comment.respostas.map((reply) => (
                        <CommentItem
                            key={reply.id}
                            comment={reply}
                            articleId={articleId}
                            onReply={onReply}
                            onUpdate={onUpdate}
                            onDelete={onDelete}
                            depth={depth + 1}
                            getAuthorLoginById={getAuthorLoginById}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

export function CommentSection({ articleId }: CommentSectionProps) {
    const [comments, setComments] = useState<Comentario[]>([])
    const [newComment, setNewComment] = useState('')
    const [replyTo, setReplyTo] = useState<number | null>(null)
    const [replyMentionPrefix, setReplyMentionPrefix] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [suggestions, setSuggestions] = useState<string[]>([])
    const [mentionQuery, setMentionQuery] = useState('')
    const textareaRef = useRef<HTMLTextAreaElement | null>(null)
    const { isAuthenticated, user } = useAuth()
    const { toast } = useToast()

    useEffect(() => {
        loadComments()
    }, [articleId])

    const loadComments = async () => {
        try {
            const data = await api.getComments(articleId)
            setComments(data)
        } catch (error) {
            console.error('Failed to load comments:', error)
        }
    }

    const handleSubmit = async () => {
        if (!isAuthenticated) {
            toast({
                title: 'Faça login para comentar',
                description: 'Você precisa estar logado para comentar.',
                variant: 'destructive',
            })
            return
        }

        if (newComment.length < 10 || newComment.length > 500) {
            toast({
                title: 'Comentário inválido',
                description: 'O comentário deve ter entre 10 e 500 caracteres.',
                variant: 'destructive',
            })
            return
        }

        setIsLoading(true)
        try {
            await api.createComment(articleId, newComment, replyTo || undefined)
            setNewComment('')
            setReplyTo(null)
            loadComments()
            toast({ title: 'Comentário publicado!' })
        } catch (error) {
            toast({
                title: 'Erro ao comentar',
                description: 'Não foi possível publicar seu comentário.',
                variant: 'destructive',
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleDelete = async (commentId: number) => {
        try {
            await api.deleteComment(commentId)
            loadComments()
            toast({ title: 'Comentário removido!' })
        } catch (error) {
            toast({
                title: 'Erro ao remover',
                description: 'Não foi possível remover o comentário.',
                variant: 'destructive',
            })
        }
    }

    const findCommentById = (list: any[], id: number | null): any | null => {
        if (!id) return null
        for (const c of list) {
            if (c.id === id) return c
            if (c.respostas && c.respostas.length > 0) {
                const found = findCommentById(c.respostas, id)
                if (found) return found
            }
        }
        return null
    }

    const replyToComment = findCommentById(comments, replyTo)

    const getAuthorLoginById = (id: number | null) => {
        if (!id) return null
        const found = findCommentById(comments, id)
        return found?.autor?.login ?? null
    }

    const findTopLevelParentId = (list: any[], id: number | null): number | null => {
        if (!id) return null
        for (const root of list) {
            if (root.id === id) return root.id
            if (root.respostas && root.respostas.length > 0) {
                if (root.respostas.some((r: any) => r.id === id)) return root.id
            }
        }
        return null
    }

    const getThreadUserLogins = (rootId: number | null) => {
        if (!rootId) return []
        const root = comments.find((c) => c.id === rootId)
        if (!root) return []
        const users = new Set<string>()
        users.add(root.autor.login)
        if (root.respostas) root.respostas.forEach((r: any) => users.add(r.autor.login))
        return Array.from(users)
    }

    const onReply = (id: number) => {
        const login = getAuthorLoginById(id)
        setReplyTo(id)
        if (login) {
            const prefix = `@${login} `
            setReplyMentionPrefix(prefix)
            setNewComment(prefix)
            setTimeout(() => textareaRef.current?.focus(), 0)
        }
    }

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-serif font-bold text-foreground">
                Comentários ({comments.reduce((acc, c) => acc + 1 + (c.respostas?.length || 0), 0)})
            </h3>

            {/* Comment Form */}
            {isAuthenticated ? (
                <div className="space-y-3">
                    {replyTo && replyToComment && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md">
                            <Reply className="h-4 w-4" />
                            <span>Respondendo a @{replyToComment.autor.login}</span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 ml-auto"
                                onClick={() => {
                                    setReplyTo(null)
                                    setReplyMentionPrefix(null)
                                    setNewComment('')
                                    setShowSuggestions(false)
                                }}
                            >
                                <X className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    )}
                    <div className="flex gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-semibold text-primary-foreground">
                                {user?.nome?.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div className="flex-1 space-y-2">
                            <Textarea
                                placeholder="Escreva seu comentário..."
                                value={newComment}
                                onChange={(e) => {
                                    const val = e.target.value
                                    setNewComment(val)

                                    // detect mention token at caret end
                                    const m = val.match(/(^|\s)@([\w-]*)$/)
                                    if (m) {
                                        const rootId = findTopLevelParentId(comments, replyTo)
                                        const pool = getThreadUserLogins(rootId)
                                        setMentionQuery(m[2])
                                        setSuggestions(
                                            pool.filter(
                                                (u) =>
                                                    u.startsWith(m[2]) &&
                                                    `@${u} ` !== replyMentionPrefix,
                                            ),
                                        )
                                        setShowSuggestions(true)
                                    } else {
                                        setShowSuggestions(false)
                                        setSuggestions([])
                                        setMentionQuery('')
                                    }
                                }}
                                onKeyDown={(e: any) => {
                                    // If user presses Backspace while inside the mention prefix area, cancel reply
                                    if (e.key === 'Backspace' && replyTo && replyMentionPrefix) {
                                        const selStart = (e.target.selectionStart as number) || 0
                                        if (selStart <= replyMentionPrefix.length) {
                                            setReplyTo(null)
                                            setReplyMentionPrefix(null)
                                            setNewComment('')
                                            setShowSuggestions(false)
                                            setSuggestions([])
                                            e.preventDefault()
                                        }
                                    }
                                }}
                                ref={textareaRef}
                                className="min-h-[80px] resize-none"
                            />

                            {/* Mention suggestions dropdown */}
                            {showSuggestions && suggestions.length > 0 && (
                                <div className="bg-background border rounded-md mt-2 p-2 w-64">
                                    {suggestions.map((s) => (
                                        <button
                                            key={s}
                                            className="text-sm block w-full text-left py-1 px-2 hover:bg-muted rounded"
                                            onClick={() => {
                                                // replace last @fragment with chosen suggestion
                                                const replaced = newComment.replace(
                                                    /@([\w-]*)$/,
                                                    `${s} `,
                                                )
                                                setNewComment(replaced)
                                                setShowSuggestions(false)
                                                setSuggestions([])
                                                setTimeout(() => {
                                                    textareaRef.current?.focus()
                                                }, 0)
                                            }}
                                        >
                                            @{s}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">
                                    {newComment.length}/500 caracteres (mínimo 10)
                                </span>
                                <Button onClick={handleSubmit} disabled={isLoading}>
                                    <Send className="h-4 w-4 mr-2" />
                                    Publicar
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                        <a href="/auth" className="text-primary hover:underline">
                            Faça login
                        </a>{' '}
                        para comentar nesta notícia.
                    </p>
                </div>
            )}

            {/* Comments List */}
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {comments.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                        Nenhum comentário ainda. Seja o primeiro a comentar!
                    </p>
                ) : (
                    comments.map((comment) => (
                        <CommentItem
                            key={comment.id}
                            comment={comment}
                            articleId={articleId}
                            onReply={onReply}
                            onUpdate={loadComments}
                            onDelete={handleDelete}
                            getAuthorLoginById={getAuthorLoginById}
                        />
                    ))
                )}
            </div>
        </div>
    )
}
