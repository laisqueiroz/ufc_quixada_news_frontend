import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ReactionBar } from '../ReactionBar'

vi.mock('../../../lib/api', () => {
    const getReactions = vi
        .fn()
        .mockResolvedValue({ CURTIDA: 0, AMEI: 0, TRISTE: 0, SURPRESO: 0, PARABENS: 0 })
    const getMyReaction = vi.fn().mockResolvedValue(null)
    const createReaction = vi.fn(() => new Promise((res) => setTimeout(() => res(undefined), 150)))
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

describe('ReactionBar concurrency guard', () => {
    beforeEach(() => vi.resetAllMocks())

    test('prevents multiple createReaction calls when clicking quickly', async () => {
        render(<ReactionBar articleId={50} />)

        await waitFor(() =>
            expect(screen.getByRole('button', { name: /Curtir/i })).not.toBeDisabled(),
        )
        const btn = screen.getByRole('button', { name: /Curtir/i })
        // click multiple times quickly
        fireEvent.click(btn)
        fireEvent.click(btn)
        fireEvent.click(btn)

        // wait briefly and assert createReaction was called only once
        await new Promise((r) => setTimeout(r, 300))
        expect(api.createReaction).toHaveBeenCalledTimes(1)
    })
})
