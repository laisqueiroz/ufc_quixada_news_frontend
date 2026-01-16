import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { api, ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

type AuthTab = 'login' | 'register' | 'forgot' | 'reset'

export default function AuthPage() {
    const [searchParams] = useSearchParams()
    const [activeTab, setActiveTab] = useState<AuthTab>('login')
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const { login, register, isAuthenticated } = useAuth()
    const navigate = useNavigate()
    const { toast } = useToast()

    // Form states
    const [loginForm, setLoginForm] = useState({ login: '', senha: '' })
    const [registerForm, setRegisterForm] = useState({
        nome: '',
        login: '',
        email: '',
        senha: '',
        confirmarSenha: '',
        perfil: '' as 'estudante' | 'docente' | 'servidor' | 'bolsista' | 'visitante' | '',
    })
    const [forgotForm, setForgotForm] = useState({ email: '' })
    const [resetForm, setResetForm] = useState({ token: '', senha: '', confirmarSenha: '' })

    useEffect(() => {
        const tab = searchParams.get('tab')
        const token = searchParams.get('token')
        if (tab === 'register') setActiveTab('register')
        if (tab === 'forgot') setActiveTab('forgot')
        if (token) {
            setActiveTab('reset')
            setResetForm((prev) => ({ ...prev, token }))
        }
    }, [searchParams])

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/')
        }
    }, [isAuthenticated, navigate])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!loginForm.login || !loginForm.senha) {
            toast({ title: 'Preencha todos os campos', variant: 'destructive' })
            return
        }

        setIsLoading(true)
        try {
            await login(loginForm.login, loginForm.senha)
            toast({ title: 'Login realizado com sucesso!' })
            navigate('/')
        } catch (error) {
            const message = error instanceof ApiError ? error.message : 'Erro ao fazer login'
            toast({ title: 'Erro no login', description: message, variant: 'destructive' })
        } finally {
            setIsLoading(false)
        }
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()

        if (
            !registerForm.nome ||
            !registerForm.login ||
            !registerForm.email ||
            !registerForm.senha ||
            !registerForm.perfil
        ) {
            toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' })
            return
        }

        if (registerForm.senha.length < 6) {
            toast({ title: 'A senha deve ter no mínimo 6 caracteres', variant: 'destructive' })
            return
        }

        if (registerForm.senha !== registerForm.confirmarSenha) {
            toast({ title: 'As senhas não coincidem', variant: 'destructive' })
            return
        }

        // allow external emails for visitantes
        if (
            registerForm.perfil !== 'visitante' &&
            !registerForm.email.endsWith('@ufc.br') &&
            !registerForm.email.endsWith('.ufc.br')
        ) {
            toast({ title: 'Use um e-mail institucional da UFC (@ufc.br)', variant: 'destructive' })
            return
        }

        setIsLoading(true)
        try {
            await register({
                nome: registerForm.nome,
                login: registerForm.login,
                email: registerForm.email,
                senha: registerForm.senha,
                perfil: registerForm.perfil,
            })
            toast({ title: 'Conta criada com sucesso!' })
            navigate('/')
        } catch (error) {
            const message = error instanceof ApiError ? error.message : 'Erro ao criar conta'
            toast({ title: 'Erro no cadastro', description: message, variant: 'destructive' })
        } finally {
            setIsLoading(false)
        }
    }

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!forgotForm.email) {
            toast({ title: 'Informe seu e-mail', variant: 'destructive' })
            return
        }

        setIsLoading(true)
        try {
            await api.forgotPassword(forgotForm.email)
            toast({
                title: 'E-mail enviado!',
                description:
                    'Se este e-mail estiver cadastrado, você receberá instruções para redefinir sua senha.',
            })
            setForgotForm({ email: '' })
        } catch (error) {
            toast({
                title: 'E-mail enviado!',
                description: 'Se este e-mail estiver cadastrado, você receberá instruções.',
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!resetForm.token || !resetForm.senha) {
            toast({ title: 'Preencha todos os campos', variant: 'destructive' })
            return
        }

        if (resetForm.senha.length < 6) {
            toast({ title: 'A senha deve ter no mínimo 6 caracteres', variant: 'destructive' })
            return
        }

        if (resetForm.senha !== resetForm.confirmarSenha) {
            toast({ title: 'As senhas não coincidem', variant: 'destructive' })
            return
        }

        setIsLoading(true)
        try {
            await api.resetPassword(resetForm.token, resetForm.senha)
            toast({ title: 'Senha redefinida com sucesso!' })
            setActiveTab('login')
        } catch (error) {
            const message = error instanceof ApiError ? error.message : 'Token inválido ou expirado'
            toast({
                title: 'Erro ao redefinir senha',
                description: message,
                variant: 'destructive',
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-muted/30 flex items-center justify-center py-12 px-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Voltar ao início
                    </Link>
                    <h1 className="text-2xl font-serif font-bold text-foreground">Jornal UFC</h1>
                    <p className="text-muted-foreground">Acesse sua conta ou cadastre-se</p>
                </div>

                <Card>
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AuthTab)}>
                        <CardHeader className="pb-4">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="login">Entrar</TabsTrigger>
                                <TabsTrigger value="register">Cadastrar</TabsTrigger>
                            </TabsList>
                        </CardHeader>

                        <CardContent>
                            {/* Login Tab */}
                            <TabsContent value="login" className="mt-0">
                                <form onSubmit={handleLogin} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="login-username">Login</Label>
                                        <Input
                                            id="login-username"
                                            placeholder="Seu login"
                                            value={loginForm.login}
                                            onChange={(e) =>
                                                setLoginForm({
                                                    ...loginForm,
                                                    login: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="login-password">Senha</Label>
                                        <div className="relative">
                                            <Input
                                                id="login-password"
                                                type={showPassword ? 'text' : 'password'}
                                                placeholder="Sua senha"
                                                value={loginForm.senha}
                                                onChange={(e) =>
                                                    setLoginForm({
                                                        ...loginForm,
                                                        senha: e.target.value,
                                                    })
                                                }
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="absolute right-0 top-0 h-full px-3"
                                                onClick={() => setShowPassword(!showPassword)}
                                            >
                                                {showPassword ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="link"
                                        className="px-0 text-sm"
                                        onClick={() => setActiveTab('forgot')}
                                    >
                                        Esqueci minha senha
                                    </Button>
                                    <Button type="submit" className="w-full" disabled={isLoading}>
                                        {isLoading && (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        )}
                                        Entrar
                                    </Button>
                                </form>
                            </TabsContent>

                            {/* Register Tab */}
                            <TabsContent value="register" className="mt-0">
                                <form onSubmit={handleRegister} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="register-name">Nome Completo *</Label>
                                        <Input
                                            id="register-name"
                                            placeholder="Seu nome completo"
                                            value={registerForm.nome}
                                            onChange={(e) =>
                                                setRegisterForm({
                                                    ...registerForm,
                                                    nome: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="register-email">E-mail *</Label>
                                        <Input
                                            id="register-email"
                                            type="email"
                                            placeholder={
                                                registerForm.perfil === 'visitante'
                                                    ? 'seu.email@exemplo.com'
                                                    : 'seu.email@ufc.br'
                                            }
                                            value={registerForm.email}
                                            onChange={(e) =>
                                                setRegisterForm({
                                                    ...registerForm,
                                                    email: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="register-login">Login *</Label>
                                        <Input
                                            id="register-login"
                                            placeholder="Escolha um login"
                                            value={registerForm.login}
                                            onChange={(e) =>
                                                setRegisterForm({
                                                    ...registerForm,
                                                    login: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="register-perfil">Perfil *</Label>
                                        <Select
                                            value={registerForm.perfil}
                                            onValueChange={(v) =>
                                                setRegisterForm({
                                                    ...registerForm,
                                                    perfil: v as typeof registerForm.perfil,
                                                })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione seu perfil" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="estudante">Estudante</SelectItem>
                                                <SelectItem value="docente">Docente</SelectItem>
                                                <SelectItem value="servidor">
                                                    Servidor Técnico-Administrativo
                                                </SelectItem>
                                                <SelectItem value="bolsista">Bolsista</SelectItem>{' '}
                                                <SelectItem value="visitante">
                                                    Visitante (e-mail externo)
                                                </SelectItem>{' '}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="register-password">Senha *</Label>
                                        <Input
                                            id="register-password"
                                            type="password"
                                            placeholder="Mínimo 6 caracteres"
                                            value={registerForm.senha}
                                            onChange={(e) =>
                                                setRegisterForm({
                                                    ...registerForm,
                                                    senha: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="register-confirm">Confirmar Senha *</Label>
                                        <Input
                                            id="register-confirm"
                                            type="password"
                                            placeholder="Repita a senha"
                                            value={registerForm.confirmarSenha}
                                            onChange={(e) =>
                                                setRegisterForm({
                                                    ...registerForm,
                                                    confirmarSenha: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                    <Button type="submit" className="w-full" disabled={isLoading}>
                                        {isLoading && (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        )}
                                        Criar Conta
                                    </Button>
                                </form>
                            </TabsContent>

                            {/* Forgot Password Tab */}
                            <TabsContent value="forgot" className="mt-0">
                                <CardTitle className="text-lg mb-2">Recuperar Senha</CardTitle>
                                <CardDescription className="mb-4">
                                    Informe seu e-mail cadastrado para receber o código de
                                    recuperação.
                                </CardDescription>
                                <form onSubmit={handleForgotPassword} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="forgot-email">E-mail</Label>
                                        <Input
                                            id="forgot-email"
                                            type="email"
                                            placeholder="seu.email@ufc.br"
                                            value={forgotForm.email}
                                            onChange={(e) =>
                                                setForgotForm({ email: e.target.value })
                                            }
                                        />
                                    </div>
                                    <Button type="submit" className="w-full" disabled={isLoading}>
                                        {isLoading && (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        )}
                                        Enviar Código
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="w-full"
                                        onClick={() => setActiveTab('login')}
                                    >
                                        Voltar ao login
                                    </Button>
                                </form>
                            </TabsContent>

                            {/* Reset Password Tab */}
                            <TabsContent value="reset" className="mt-0">
                                <CardTitle className="text-lg mb-2">Redefinir Senha</CardTitle>
                                <CardDescription className="mb-4">
                                    Insira o código recebido por e-mail e sua nova senha.
                                </CardDescription>
                                <form onSubmit={handleResetPassword} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="reset-token">Código de Recuperação</Label>
                                        <Input
                                            id="reset-token"
                                            placeholder="Cole o código recebido"
                                            value={resetForm.token}
                                            onChange={(e) =>
                                                setResetForm({
                                                    ...resetForm,
                                                    token: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="reset-password">Nova Senha</Label>
                                        <Input
                                            id="reset-password"
                                            type="password"
                                            placeholder="Mínimo 6 caracteres"
                                            value={resetForm.senha}
                                            onChange={(e) =>
                                                setResetForm({
                                                    ...resetForm,
                                                    senha: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="reset-confirm">Confirmar Nova Senha</Label>
                                        <Input
                                            id="reset-confirm"
                                            type="password"
                                            placeholder="Repita a nova senha"
                                            value={resetForm.confirmarSenha}
                                            onChange={(e) =>
                                                setResetForm({
                                                    ...resetForm,
                                                    confirmarSenha: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                    <Button type="submit" className="w-full" disabled={isLoading}>
                                        {isLoading && (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        )}
                                        Redefinir Senha
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="w-full"
                                        onClick={() => setActiveTab('login')}
                                    >
                                        Voltar ao login
                                    </Button>
                                </form>
                            </TabsContent>
                        </CardContent>
                    </Tabs>
                </Card>
            </div>
        </div>
    )
}
