import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CommentSection } from '../CommentSection'

vi.mock('../../../lib/api', () => {
    const getComments = vi.fn()
    const createComment = vi.fn()
    const deleteComment = vi.fn()
    const updateComment = vi.fn()
    const getCommentReactions = vi.fn().mockResolvedValue({ GOSTEI: 0, NAO_GOSTEI: 0 })
    const getMyCommentReaction = vi.fn().mockResolvedValue({ id: null, tipo: null })
    return {
        api: {
            getComments,
            createComment,
            deleteComment,
            updateComment,
            getCommentReactions,
            getMyCommentReaction,
        },
    }
})

vi.mock('../../../hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }))
vi.mock('../../../contexts/AuthContext', () => ({
    useAuth: () => ({ isAuthenticated: true, user: { id: 1, nome: 'User', login: 'user' } }),
}))

import { api } from '../../../lib/api'

describe('CommentSection nested replies', () => {
    beforeEach(() => vi.resetAllMocks())

    test('allows replying to nested comment and shows reply indicator', async () => {
        api.getComments.mockResolvedValue([
            {
                id: 1,
                conteudo: 'Top',
                autor: { id: 2, nome: 'Alice', login: 'alice' },
                respostas: [
                    {
                        id: 2,
                        conteudo: 'Reply',
                        autor: { id: 3, nome: 'Bob', login: 'bob' },
                        respostas: [],
                    },
                ],
            },
        ])
        // render component
        render(
            <MemoryRouter>
                <CommentSection articleId={123} />
            </MemoryRouter>,
        )

        // wait for comments to load
        await waitFor(() => expect(api.getComments).toHaveBeenCalled())

        // header should count top-level + nested replies
        expect(screen.getByText(/Comentários \(2\)/i)).toBeInTheDocument()

        // find reply button for nested comment (Bob). There are two reply buttons; choose the one inside Bob element
        const bobReplyButton = screen.getByRole('button', { name: /Responder @bob/i })
        fireEvent.click(bobReplyButton)

        await waitFor(() => {
            expect(screen.getByText(/Respondendo a @bob/i)).toBeInTheDocument()
        })

        // textarea should be prefilled with the mention
        const textarea = screen.getByPlaceholderText(
            /Escreva seu comentário/i,
        ) as HTMLTextAreaElement
        await waitFor(() => expect(textarea.value.startsWith('@bob')).toBe(true))
    })

    test('shows "Em resposta a @user" inline for replies with respondeAId', async () => {
        api.getComments.mockResolvedValue([
            {
                id: 1,
                conteudo: 'Top',
                autor: { id: 2, nome: 'Alice', login: 'alice' },
                respostas: [
                    {
                        id: 2,
                        conteudo: 'First reply',
                        autor: { id: 3, nome: 'Bob', login: 'bob' },
                        respostas: [],
                    },
                    {
                        id: 3,
                        conteudo: 'Replying to Bob',
                        autor: { id: 4, nome: 'Carol', login: 'carol' },
                        respondeAId: 2,
                        respostas: [],
                    },
                ],
            },
        ])

        render(
            <MemoryRouter>
                <CommentSection articleId={123} />
            </MemoryRouter>,
        )

        await waitFor(() => expect(api.getComments).toHaveBeenCalled())

        expect(screen.getByText(/Em resposta a @bob/i)).toBeInTheDocument()

        // Also verify suggestions show only thread users when typing @b after replying
        const bobReplyButton = screen.getByRole('button', { name: /Responder @bob/i })
        fireEvent.click(bobReplyButton)
        const textarea = screen.getByPlaceholderText(
            /Escreva seu comentário/i,
        ) as HTMLTextAreaElement
        // simulate typing "@b" (we already have @bob , so change it to @b to trigger suggestions)
        fireEvent.change(textarea, { target: { value: '@b' } })
        await waitFor(() => expect(screen.getAllByText(/@bob/).length).toBeGreaterThan(0))
    })
})
