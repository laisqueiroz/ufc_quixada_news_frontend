import { Link, useNavigate } from 'react-router-dom'
import { Home, Search, RefreshCw, Link2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCallback, useMemo } from 'react'

const NotFound = () => {
    const navigate = useNavigate()
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/'
    const search = typeof window !== 'undefined' ? window.location.search : ''

    const tryAsHash = useCallback(() => {
        // convert current path to hash-based URL and navigate (helps hosts that return 404)
        const target = `/#${pathname}${search}${window.location.hash}`
        // replace so history doesn't keep the broken path
        window.location.replace(target)
    }, [pathname, search])

    const tryReload = useCallback(() => {
        // attempt a normal reload (useful when server transiently failed)
        window.location.reload()
    }, [])

    const reportMailTo = useMemo(() => {
        const subject = encodeURIComponent(`404 on ${pathname}`)
        const body = encodeURIComponent(
            `URL: ${window.location.href}%0AUser Agent: ${navigator.userAgent}%0A\nDescribe what you expected:`,
        )
        return `mailto:admin@ufcquixada.edu.br?subject=${subject}&body=${body}`
    }, [pathname])

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center space-y-6 px-4 max-w-2xl">
                <div className="space-y-2">
                    <h1 className="text-6xl font-serif font-bold text-primary">404</h1>
                    <h2 className="text-2xl font-serif font-bold text-foreground">
                        Página não encontrada
                    </h2>
                    <p className="text-muted-foreground max-w-md mx-auto">
                        Não encontramos a página <span className="font-mono">{pathname}</span>.
                    </p>
                </div>

                <div className="flex justify-center gap-4 flex-wrap">
                    <Button asChild>
                        <Link to="/">
                            <Home className="h-4 w-4 mr-2" />
                            Ir para o início
                        </Link>
                    </Button>

                    <Button variant="outline" asChild>
                        <Link to="/buscar">
                            <Search className="h-4 w-4 mr-2" />
                            Buscar notícias
                        </Link>
                    </Button>

                    <Button onClick={() => navigate(-1)} variant="ghost">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Voltar
                    </Button>

                    <Button onClick={tryReload} variant="outline">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Recarregar
                    </Button>

                    <Button onClick={tryAsHash} variant="secondary">
                        <Link2 className="h-4 w-4 mr-2" />
                        Abrir como SPA (fallback)
                    </Button>
                </div>

                <div className="mt-6 text-sm text-muted-foreground">
                    <div className="mb-2">Sugestões:</div>
                    <ul className="list-disc list-inside text-left max-w-md mx-auto space-y-2">
                        <li>
                            Se você abriu esta URL diretamente, tente{' '}
                            <strong>"Abrir como SPA"</strong> (útil em hosts estáticos).
                        </li>
                        <li>
                            Se o problema persistir,{' '}
                            <a className="underline" href={reportMailTo}>
                                <AlertTriangle className="inline-block mr-2" /> reporte-nos por
                                e‑mail
                            </a>
                            .
                        </li>
                    </ul>
                </div>

                <div className="mt-6 text-xs text-muted-foreground text-center">
                    <div>
                        Path:{' '}
                        <code className="bg-muted px-2 rounded">
                            {pathname}
                            {search}
                        </code>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default NotFound
