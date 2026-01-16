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

describe('ReactionBar retry load', () => {
    beforeEach(() => vi.resetAllMocks())

    test('buttons disabled until user reaction loaded and become active after load', async () => {
        api.getReactions.mockResolvedValue({
            CURTIDA: 0,
            AMEI: 0,
            TRISTE: 0,
            SURPRESO: 0,
            PARABENS: 0,
        })
        // simulate delayed user reaction (resolved after some time)
        let resolveLater: (v: any) => void
        api.getMyReaction.mockImplementation(() => new Promise((res) => (resolveLater = res)))

        render(<ReactionBar articleId={30} />)

        const curBtn = screen.getByRole('button', { name: /Curtir/i })
        // should be disabled initially because user reaction not yet loaded
        expect(curBtn).toBeDisabled()

        // resolve user reaction
        resolveLater({ id: 7, tipo: 'CURTIDA' })
        await waitFor(() => expect(curBtn).not.toBeDisabled())

        // now button should show active class
        await waitFor(() => expect(curBtn.className.includes('bg-muted')).toBe(true))
    })
})
