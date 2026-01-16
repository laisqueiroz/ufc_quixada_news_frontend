import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { ReactionBar } from '../ReactionBar'

vi.mock('../../../lib/api', () => {
    const getReactions = vi.fn()
    const getMyReaction = vi.fn()
    return { api: { getReactions, getMyReaction } }
})
vi.mock('../../../contexts/AuthContext', () => ({
    useAuth: () => ({ isAuthenticated: true, user: { id: 1 } }),
}))
vi.mock('../../../hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }))

import { api } from '../../../lib/api'

describe('ReactionBar load user reaction', () => {
    beforeEach(() => vi.resetAllMocks())

    test('marks button active when user already reacted', async () => {
        api.getReactions.mockResolvedValue({
            CURTIDA: 1,
            AMEI: 0,
            TRISTE: 0,
            SURPRESO: 0,
            PARABENS: 0,
        })
        api.getMyReaction.mockResolvedValue({ id: 5, tipo: 'CURTIDA' })

        render(<ReactionBar articleId={20} />)

        await waitFor(() => expect(api.getReactions).toHaveBeenCalled())
        // ensure the user's reaction has been requested and applied
        await waitFor(() => expect(api.getMyReaction).toHaveBeenCalled())
        const curBtn = screen.getByRole('button', { name: /Curtir/i })
        await waitFor(() => expect(curBtn.className.includes('bg-muted')).toBe(true))
    })
})
