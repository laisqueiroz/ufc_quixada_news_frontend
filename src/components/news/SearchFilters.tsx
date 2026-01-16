import { useState } from 'react'
import { Search, Filter, X, Calendar } from 'lucide-react'
import { Categoria } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface SearchFiltersProps {
    onSearch: (params: {
        busca?: string
        categoria?: Categoria
        dataInicial?: string
        dataFinal?: string
    }) => void
    isLoading?: boolean
    initialBusca?: string
    initialCategoria?: Categoria
    initialDataInicial?: string
    initialDataFinal?: string
}

const categories: { value: Categoria; label: string }[] = [
    { value: 'EVENTOS', label: 'Eventos' },
    { value: 'OPORTUNIDADES', label: 'Oportunidades' },
    { value: 'PESQUISA', label: 'Pesquisa' },
    { value: 'PROJETOS', label: 'Projetos' },
    { value: 'AVISOS', label: 'Avisos' },
    { value: 'OUTROS', label: 'Outros' },
]

export function SearchFilters({
    onSearch,
    isLoading,
    initialBusca,
    initialCategoria,
    initialDataInicial,
    initialDataFinal,
}: SearchFiltersProps) {
    const [busca, setBusca] = useState(initialBusca ?? '')
    const [categoria, setCategoria] = useState<Categoria | undefined>(initialCategoria)
    const [dataInicial, setDataInicial] = useState<Date | undefined>(
        initialDataInicial ? new Date(initialDataInicial) : undefined,
    )
    const [dataFinal, setDataFinal] = useState<Date | undefined>(
        initialDataFinal ? new Date(initialDataFinal) : undefined,
    )
    const [showFilters, setShowFilters] = useState(false)

    const hasFilters = categoria || dataInicial || dataFinal

    const handleSearch = () => {
        onSearch({
            busca: busca || undefined,
            categoria,
            dataInicial: dataInicial?.toISOString(),
            dataFinal: dataFinal?.toISOString(),
        })
    }

    const handleClearFilters = () => {
        setCategoria(undefined)
        setDataInicial(undefined)
        setDataFinal(undefined)
        onSearch({ busca: busca || undefined })
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch()
        }
    }

    return (
        <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Buscar notícias por título ou conteúdo..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="pl-10"
                    />
                </div>
                <Button onClick={handleSearch} disabled={isLoading}>
                    <Search className="h-4 w-4 mr-2" />
                    Buscar
                </Button>
                <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className={cn(hasFilters && 'border-primary text-primary')}
                >
                    <Filter className="h-4 w-4 mr-2" />
                    Filtros
                    {hasFilters && (
                        <span className="ml-2 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                            {[categoria, dataInicial, dataFinal].filter(Boolean).length}
                        </span>
                    )}
                </Button>
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div className="bg-muted/50 rounded-lg p-4 animate-fade-in">
                    <div className="flex flex-wrap gap-4">
                        {/* Category Filter */}
                        <div className="flex flex-col space-y-2">
                            <label className="text-sm font-medium text-foreground block">
                                Categoria
                            </label>
                            <Select
                                value={categoria}
                                onValueChange={(value) => setCategoria(value as Categoria)}
                            >
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Todas" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat.value} value={cat.value}>
                                            {cat.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Date Range */}
                        <div className="flex flex-col space-y-2">
                            <label className="text-sm font-medium text-foreground block">
                                Data Inicial
                            </label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            'w-[180px] flex items-center gap-2 justify-start text-left font-normal',
                                            !dataInicial && 'text-muted-foreground',
                                        )}
                                    >
                                        <Calendar className="h-4 w-4" />
                                        {dataInicial
                                            ? format(dataInicial, 'dd/MM/yyyy')
                                            : 'Selecionar'}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <CalendarComponent
                                        mode="single"
                                        selected={dataInicial}
                                        onSelect={setDataInicial}
                                        locale={ptBR}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="flex flex-col space-y-2">
                            <label className="text-sm font-medium text-foreground block">
                                Data Final
                            </label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            'w-[180px] flex items-center gap-2 justify-start text-left font-normal',
                                            !dataFinal && 'text-muted-foreground',
                                        )}
                                    >
                                        <Calendar className="h-4 w-4" />
                                        {dataFinal ? format(dataFinal, 'dd/MM/yyyy') : 'Selecionar'}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <CalendarComponent
                                        mode="single"
                                        selected={dataFinal}
                                        onSelect={setDataFinal}
                                        locale={ptBR}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Actions */}
                        <div className="flex items-end gap-2">
                            <Button onClick={handleSearch} disabled={isLoading}>
                                Aplicar Filtros
                            </Button>
                            {hasFilters && (
                                <Button variant="ghost" onClick={handleClearFilters}>
                                    <X className="h-4 w-4 mr-2" />
                                    Limpar
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
