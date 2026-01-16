import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { ReactionBar } from '../ReactionBar'

vi.mock('../../../lib/api', () => {
    const getReactions = vi.fn()
    const getMyReaction = vi.fn()
    const createReaction = vi.fn()
    const deleteReaction = vi.fn()
    const deleteReactionById = vi.fn()
    return {
        api: { getReactions, getMyReaction, createReaction, deleteReaction, deleteReactionById },
    }
})

vi.mock('../../../hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }))
vi.mock('../../../contexts/AuthContext', () => ({
    useAuth: () => ({ isAuthenticated: true, user: { id: 1 } }),
}))

import { api } from '../../../lib/api'

describe('ReactionBar', () => {
    beforeEach(() => vi.resetAllMocks())

    test('adds and removes reaction on repeated clicks', async () => {
        // initial reactions: 0, then after createReaction server returns 1
        api.getReactions.mockResolvedValueOnce({
            CURTIDA: 0,
            AMEI: 0,
            TRISTE: 0,
            SURPRESO: 0,
            PARABENS: 0,
        })
        api.getReactions.mockResolvedValueOnce({
            CURTIDA: 1,
            AMEI: 0,
            TRISTE: 0,
            SURPRESO: 0,
            PARABENS: 0,
        })
        api.getMyReaction.mockResolvedValueOnce(null)
        api.createReaction.mockResolvedValueOnce(undefined)
        // after create, getMyReaction should return CURTIDA with id
        api.getMyReaction.mockResolvedValueOnce({ id: 1, tipo: 'CURTIDA' })
        api.deleteReactionById.mockResolvedValueOnce({ ok: true })
        // after delete, getMyReaction should return null
        api.getMyReaction.mockResolvedValueOnce({ id: null, tipo: null })

        render(<ReactionBar articleId={10} />)

        await waitFor(() => expect(api.getReactions).toHaveBeenCalled())
        // ensure user reaction has been loaded and buttons are enabled
        await waitFor(() =>
            expect(screen.getByRole('button', { name: /Curtir/i })).not.toBeDisabled(),
        )
        // ensure the client has requested the user's reaction (so userReactionLoaded is true)
        await waitFor(() => expect(api.getMyReaction).toHaveBeenCalled())

        const btn = screen.getByRole('button', { name: /Curtir/i })
        await new Promise((r) => setTimeout(r, 10))
        fireEvent.click(btn)
        await waitFor(() => expect(api.createReaction).toHaveBeenCalled())
        // after click, the component should have reloaded counts and show 1
        await waitFor(() => expect(within(btn).getByText('1')).toBeInTheDocument())

        // simulate server returning 0 after deletion
        api.getReactions.mockResolvedValueOnce({
            CURTIDA: 0,
            AMEI: 0,
            TRISTE: 0,
            SURPRESO: 0,
            PARABENS: 0,
        })
        fireEvent.click(btn)
        // wait until the UI reflects the server (counts reload)
        await waitFor(() => expect(within(btn).getByText('0')).toBeInTheDocument())
        // optional: ensure delete API (by id) was at least attempted
        await waitFor(() => expect(api.deleteReactionById).toHaveBeenCalled())
    })

    test('switching reaction updates counts', async () => {
        // initial: curtida 1
        api.getReactions.mockResolvedValueOnce({
            CURTIDA: 1,
            AMEI: 0,
            TRISTE: 0,
            SURPRESO: 0,
            PARABENS: 0,
        })
        api.getMyReaction.mockResolvedValueOnce({ id: 2, tipo: 'CURTIDA' })
        api.createReaction.mockResolvedValueOnce(undefined)
        // after switching, server returns updated counts (simulate sparse response - only AMEI present)
        api.getReactions.mockResolvedValueOnce({ AMEI: 1 })
        api.getMyReaction.mockResolvedValueOnce({ id: 3, tipo: 'AMEI' })

        render(<ReactionBar articleId={11} />)

        await waitFor(() => expect(api.getReactions).toHaveBeenCalled())
        await waitFor(() =>
            expect(screen.getByRole('button', { name: /Amei/i })).not.toBeDisabled(),
        )
        await waitFor(() => expect(api.getMyReaction).toHaveBeenCalled())

        const curBtn = screen.getByRole('button', { name: /Curtir/i })
        const ameiBtn = screen.getByRole('button', { name: /Amei/i })
        await new Promise((r) => setTimeout(r, 10))
        fireEvent.click(ameiBtn)
        await waitFor(() => expect(api.createReaction).toHaveBeenCalled())

        // After sync, CURTIDA should decrement and AMEI increment (check within each button)
        await waitFor(() => expect(within(curBtn).getByText('0')).toBeInTheDocument())
        await waitFor(() => expect(within(ameiBtn).getByText('1')).toBeInTheDocument())
    })
})
