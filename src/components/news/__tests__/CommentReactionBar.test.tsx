import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { CommentReactionBar } from '../CommentReactionBar'

vi.mock('../../../lib/api', () => {
    const getCommentReactions = vi.fn()
    const getMyCommentReaction = vi.fn()
    const createCommentReaction = vi.fn()
    const deleteCommentReaction = vi.fn()
    const deleteCommentReactionById = vi.fn()
    return {
        api: {
            getCommentReactions,
            getMyCommentReaction,
            createCommentReaction,
            deleteCommentReaction,
            deleteCommentReactionById,
        },
    }
})

vi.mock('../../../hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }))
vi.mock('../../../contexts/AuthContext', () => ({
    useAuth: () => ({ isAuthenticated: true, user: { id: 1 } }),
}))

import { api } from '../../../lib/api'

describe('CommentReactionBar', () => {
    beforeEach(() => vi.resetAllMocks())

    test('adds and removes reaction on repeated clicks', async () => {
        api.getCommentReactions.mockResolvedValueOnce({ GOSTEI: 0, NAO_GOSTEI: 0 })
        api.getCommentReactions.mockResolvedValueOnce({ GOSTEI: 1, NAO_GOSTEI: 0 })
        api.getMyCommentReaction.mockResolvedValueOnce({ id: null, tipo: null })
        api.createCommentReaction.mockResolvedValueOnce(undefined)
        api.getMyCommentReaction.mockResolvedValueOnce({ id: 1, tipo: 'GOSTEI' })
        api.deleteCommentReactionById.mockResolvedValueOnce({ ok: true })
        api.getMyCommentReaction.mockResolvedValueOnce({ id: null, tipo: null })

        render(<CommentReactionBar articleId={10} commentId={5} />)

        await waitFor(() => expect(api.getCommentReactions).toHaveBeenCalled())
        await waitFor(() => expect(api.getMyCommentReaction).toHaveBeenCalled())

        const btn = screen.getByRole('button', { name: /^Gostei$/i })
        fireEvent.click(btn)
        await waitFor(() => expect(api.createCommentReaction).toHaveBeenCalled())
        await waitFor(() => expect(within(btn).getByText('1')).toBeInTheDocument())

        // remove
        fireEvent.click(btn)
        await waitFor(() => expect(api.deleteCommentReactionById).toHaveBeenCalled())
    })

    test('switching reaction updates counts', async () => {
        api.getCommentReactions.mockResolvedValueOnce({ GOSTEI: 1, NAO_GOSTEI: 0 })
        api.getMyCommentReaction.mockResolvedValueOnce({ id: 2, tipo: 'GOSTEI' })
        api.createCommentReaction.mockResolvedValueOnce(undefined)
        api.getCommentReactions.mockResolvedValueOnce({ NAO_GOSTEI: 1 })
        api.getMyCommentReaction.mockResolvedValueOnce({ id: 3, tipo: 'NAO_GOSTEI' })

        render(<CommentReactionBar articleId={11} commentId={6} />)

        await waitFor(() => expect(api.getCommentReactions).toHaveBeenCalled())
        await waitFor(() => expect(api.getMyCommentReaction).toHaveBeenCalled())

        const gosteiBtn = screen.getByRole('button', { name: /^Gostei$/i })
        const naoGosteiBtn = screen.getByRole('button', { name: /^Não gostei$/i })
        fireEvent.click(naoGosteiBtn)
        await waitFor(() => expect(api.createCommentReaction).toHaveBeenCalled())

        await waitFor(() => expect(within(gosteiBtn).getByText('0')).toBeInTheDocument())
        await waitFor(() => expect(within(naoGosteiBtn).getByText('1')).toBeInTheDocument())
    })
})
