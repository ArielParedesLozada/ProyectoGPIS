import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { router } from '@inertiajs/react';
import { Filter } from 'lucide-react';

interface PublicationFiltersProps {
    categories: Array<{ id: number; name: string }>;
    selectedCategory?: number;
    selectedType?: string;
    selectedMinPrice?: number;
    selectedMaxPrice?: number;
}

export default function PublicationFilters({ 
    categories, 
    selectedCategory, 
    selectedType,
    selectedMinPrice,
    selectedMaxPrice
}: PublicationFiltersProps) {
    const [category, setCategory] = useState(selectedCategory?.toString() || 'all');
    const [type, setType] = useState(selectedType || 'all');
    const [minPrice, setMinPrice] = useState(selectedMinPrice?.toString() || '');
    const [maxPrice, setMaxPrice] = useState(selectedMaxPrice?.toString() || '');
    const [showPriceFilter, setShowPriceFilter] = useState(false);

    const handleFilterChange = (newCategory: string, newType: string) => {
        setCategory(newCategory);
        setType(newType);
        
        const query: Record<string, string | null> = {};
        
        if (newCategory !== 'all') query.category_id = newCategory;
        if (newType !== 'all') query.type = newType;
        if (minPrice) query.min_price = minPrice;
        if (maxPrice) query.max_price = maxPrice;

        router.get('/publication', query, {
            preserveState: true,
            replace: true,
        });
    };

    const handlePriceFilter = () => {
        const query: Record<string, string | null> = {};
        
        if (category !== 'all') query.category_id = category;
        if (type !== 'all') query.type = type;
        if (minPrice) query.min_price = minPrice;
        if (maxPrice) query.max_price = maxPrice;

        router.get('/publication', query, {
            preserveState: true,
            replace: true,
        });
    };

    const clearFilters = () => {
        setCategory('all');
        setType('all');
        setMinPrice('');
        setMaxPrice('');
        router.get('/publication', {}, {
            preserveState: true,
            replace: true,
        });
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            {/* Filtros principales */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Filtrar por categoría:</Label>
                    <Select 
                        value={category} 
                        onValueChange={(value) => handleFilterChange(value, type)}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Todas las categorías" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas las categorías</SelectItem>
                            {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id.toString()}>
                                    {cat.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex-1">
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Filtrar por tipo:</Label>
                    <Select 
                        value={type} 
                        onValueChange={(value) => handleFilterChange(category, value)}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Todos los tipos" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los tipos</SelectItem>
                            <SelectItem value="producto">Producto</SelectItem>
                            <SelectItem value="servicio">Servicio</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-end gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setShowPriceFilter(!showPriceFilter)}
                        className="flex items-center gap-2 bg-gray-200 text-gray-700 hover:bg-gray-300"
                    >
                        <Filter className="h-4 w-4" />
                        Filtros
                    </Button>
                    <Button
                        variant="outline"
                        onClick={clearFilters}
                        className="bg-gray-200 text-gray-700 hover:bg-gray-300"
                    >
                        Limpiar filtros
                    </Button>
                </div>
            </div>

            {/* Filtro de precio - oculto por defecto */}
            {showPriceFilter && (
                <div className="border-t pt-4 mt-4">
                    <div className="max-w-sm">
                        <Label className="text-lg font-semibold text-gray-900 mb-3 block">Filtrar por precio</Label>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                                <Label className="text-sm font-medium text-gray-700 mb-1 block">Precio mínimo</Label>
                                <Input
                                    type="number"
                                    placeholder="$0"
                                    value={minPrice}
                                    onChange={(e) => setMinPrice(e.target.value)}
                                    className="w-full text-sm"
                                />
                            </div>
                            <div>
                                <Label className="text-sm font-medium text-gray-700 mb-1 block">Precio máximo</Label>
                                <Input
                                    type="number"
                                    placeholder="$1000"
                                    value={maxPrice}
                                    onChange={(e) => setMaxPrice(e.target.value)}
                                    className="w-full text-sm"
                                />
                            </div>
                        </div>
                        <Button 
                            onClick={handlePriceFilter}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2"
                        >
                            Aplicar filtro
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}