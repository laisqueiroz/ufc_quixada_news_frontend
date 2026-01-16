import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ArticleEditor from '../ArticleEditor'

import * as ApiModule from '../../../lib/api'

// mock useToast to avoid needing provider
vi.mock('../../../hooks/use-toast', () => ({
    useToast: () => ({ toast: vi.fn() }),
}))

describe('ArticleEditor slug visual feedback', () => {
    beforeEach(() => {
        vi.resetAllMocks()
    })

    test('shows green border and "disponível" when slug is available', async () => {
        vi.spyOn(ApiModule.api, 'checkSlugAvailability').mockResolvedValue(true)

        render(
            <MemoryRouter>
                <ArticleEditor />
            </MemoryRouter>,
        )

        const input = screen.getByPlaceholderText('slug-para-url (opcional)')
        fireEvent.change(input, { target: { value: 'meu-slug' } })

        const checkBtn = screen.getByRole('button', { name: /verificar/i })
        fireEvent.click(checkBtn)

        await waitFor(() => {
            expect(screen.getByText(/disponível/i)).toBeInTheDocument()
        })

        // the className should include green border
        expect(input.className).toMatch(/border-?green-600/)
    })

    test('shows red border and "indisponível" when slug is not available', async () => {
        vi.spyOn(ApiModule.api, 'checkSlugAvailability').mockResolvedValue(false)

        render(
            <MemoryRouter>
                <ArticleEditor />
            </MemoryRouter>,
        )

        const input = screen.getByPlaceholderText('slug-para-url (opcional)')
        fireEvent.change(input, { target: { value: 'meu-slug' } })

        const checkBtn = screen.getByRole('button', { name: /verificar/i })
        fireEvent.click(checkBtn)

        await waitFor(() => {
            expect(screen.getByText(/indisponível/i)).toBeInTheDocument()
        })

        // the className should include red border
        expect(input.className).toMatch(/border-?red-600/)
    })
})
