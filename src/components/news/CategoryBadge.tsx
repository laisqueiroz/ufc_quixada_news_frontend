import { Categoria } from '@/lib/api';
import { cn } from '@/lib/utils';

interface CategoryBadgeProps {
  category: Categoria;
  className?: string;
}

const categoryLabels: Record<Categoria, string> = {
  EVENTOS: 'Eventos',
  OPORTUNIDADES: 'Oportunidades',
  PESQUISA: 'Pesquisa',
  PROJETOS: 'Projetos',
  AVISOS: 'Avisos',
  OUTROS: 'Outros',
};

const categoryClasses: Record<Categoria, string> = {
  EVENTOS: 'category-eventos',
  OPORTUNIDADES: 'category-oportunidades',
  PESQUISA: 'category-pesquisa',
  PROJETOS: 'category-projetos',
  AVISOS: 'category-avisos',
  OUTROS: 'category-outros',
};

export function CategoryBadge({ category, className }: CategoryBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        categoryClasses[category],
        className
      )}
    >
      {categoryLabels[category]}
    </span>
  );
}
