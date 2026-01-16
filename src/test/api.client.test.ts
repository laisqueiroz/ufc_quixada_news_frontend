import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ApiClient, ApiError } from '../../src/lib/api'

describe('ApiClient', () => {
    const baseUrl = 'http://api.test'
    let fetchSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
        fetchSpy = vi.spyOn(
            globalThis as unknown as Record<string, (...args: unknown[]) => unknown>,
            'fetch',
        )
        localStorage.clear()
    })

    afterEach(() => {
        fetchSpy.mockRestore()
    })

    it('parses JSON responses', async () => {
        const api = new ApiClient(baseUrl)

        fetchSpy.mockResolvedValueOnce({
            ok: true,
            status: 200,
            headers: { get: () => 'application/json' },
            json: async () => ({ curtida: 5 }),
        })

        const res = await api.getReactions(123)
        expect(res).toEqual({ curtida: 5 })
        expect(fetchSpy).toHaveBeenCalledWith(`${baseUrl}/news/123/reacoes`, expect.any(Object))
    })

    it('handles 204 No Content without calling response.json()', async () => {
        const api = new ApiClient(baseUrl)

        // set token so logout removes it later
        localStorage.setItem('auth_token', 'token-xyz')

        fetchSpy.mockResolvedValueOnce({
            ok: true,
            status: 204,
            headers: { get: () => null },
        })

        await api.logout()
        expect(localStorage.getItem('auth_token')).toBeNull()
        expect(fetchSpy).toHaveBeenCalledWith(
            `${baseUrl}/auth/logout`,
            expect.objectContaining({ method: 'POST' }),
        )
    })

    it('throws ApiError with server message on non-ok response', async () => {
        const api = new ApiClient(baseUrl)

        fetchSpy.mockResolvedValueOnce({
            ok: false,
            status: 400,
            headers: { get: () => 'application/json' },
            json: async () => ({ message: 'invalid' }),
        })

        await expect(api.getReactions(1)).rejects.toMatchObject({
            name: 'ApiError',
            status: 400,
            message: 'invalid',
        })
    })
})
