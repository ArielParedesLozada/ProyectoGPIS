import React, { useState, useEffect } from 'react';
import { Search, Filter, SortAsc, SortDesc, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { router } from '@inertiajs/react';
import ActiveFilters from './active-filters';

interface StickyToolbarProps {
  totalResults: number;
  selectedCategory?: number;
  selectedCategories?: number[];
  selectedType?: string;
  selectedMinPrice?: number;
  selectedMaxPrice?: number;
  nearLat?: number;
  nearLng?: number;
  radiusKm?: number;
  myProducts?: boolean;
  selectedSearchQuery?: string;
  selectedSortBy?: string;
  categories: Array<{ id: number; name: string }>;
  onOpenFilters: () => void;
  isFiltersOpen?: boolean;
}

export default function StickyToolbar({
  totalResults,
  selectedCategory,
  selectedCategories,
  selectedType,
  selectedMinPrice,
  selectedMaxPrice,
  nearLat,
  nearLng,
  radiusKm,
  myProducts,
  selectedSearchQuery,
  selectedSortBy,
  categories,
  onOpenFilters,
  isFiltersOpen = false
}: StickyToolbarProps) {
  const [searchQuery, setSearchQuery] = useState(selectedSearchQuery || '');
  const [sortBy, setSortBy] = useState(selectedSortBy || 'newest');

  useEffect(() => {
    const currentQuery = new URLSearchParams(window.location.search);
    const hasSearchParam = currentQuery.get('search');
    
    if (hasSearchParam && !searchQuery.trim()) {
      currentQuery.delete('search');
      router.get(`/publication?${currentQuery.toString()}`, {}, {
        preserveState: true,
        replace: true,
      });
    }
  }, [searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const query = new URLSearchParams(window.location.search);
      query.set('search', searchQuery.trim());
      router.get(`/publication?${query.toString()}`, {}, {
        preserveState: true,
        replace: true,
      });
    }
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
    const query = new URLSearchParams(window.location.search);
    query.set('sort_by', value);
    router.get(`/publication?${query.toString()}`, {}, {
      preserveState: true,
      replace: true,
    });
  };

  const clearAllFilters = () => {
    router.get('/publication', {}, {
      preserveState: true,
      replace: true,
    });
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  return (
    <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4">
        {/* Barra principal */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          {/* Buscador */}
          <div className="flex-1 max-w-md">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Buscar publicaciones..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full"
              />
            </form>
          </div>

          {/* Controles del lado derecho */}
          <div className="flex items-center gap-3">
            {/* Contador de resultados */}
            <div className="text-sm text-gray-600 hidden sm:block">
              {totalResults} resultados
            </div>

            {/* Ordenar */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 hidden sm:inline">Ordenar:</span>
              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">
                    <div className="flex items-center gap-2">
                      <SortDesc className="h-3 w-3" />
                      Más recientes
                    </div>
                  </SelectItem>
                  <SelectItem value="oldest">
                    <div className="flex items-center gap-2">
                      <SortAsc className="h-3 w-3" />
                      Más antiguos
                    </div>
                  </SelectItem>
                  <SelectItem value="price_low">
                    <div className="flex items-center gap-2">
                      <SortAsc className="h-3 w-3" />
                      Precio: menor
                    </div>
                  </SelectItem>
                  <SelectItem value="price_high">
                    <div className="flex items-center gap-2">
                      <SortDesc className="h-3 w-3" />
                      Precio: mayor
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Botón Filtros */}
            <Button
              onClick={onOpenFilters}
              variant="outline"
              className="flex items-center gap-2 h-9"
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filtros</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Filtros activos */}
        <div className="mt-4">
          <ActiveFilters
            selectedCategory={selectedCategory}
            selectedCategories={selectedCategories}
            selectedType={selectedType}
            selectedMinPrice={selectedMinPrice}
            selectedMaxPrice={selectedMaxPrice}
            nearLat={nearLat}
            nearLng={nearLng}
            radiusKm={radiusKm}
            myProducts={myProducts}
            selectedSearchQuery={selectedSearchQuery}
            selectedSortBy={selectedSortBy}
            categories={categories}
            onClearSearch={clearSearch}
          />
        </div>
      </div>
    </div>
  );
}
