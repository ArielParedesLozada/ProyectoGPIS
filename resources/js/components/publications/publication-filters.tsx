import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { router } from '@inertiajs/react';
import { Filter, MapPin, X } from 'lucide-react';

interface PublicationFiltersProps {
    categories: Array<{ id: number; name: string }>;
    selectedCategory?: number;
    selectedType?: string;
    selectedMinPrice?: number;
    selectedMaxPrice?: number;
    nearLat?: number;
    nearLng?: number;
    radiusKm?: number;
}

export default function PublicationFilters({ 
    categories, 
    selectedCategory, 
    selectedType,
    selectedMinPrice,
    selectedMaxPrice,
    nearLat,
    nearLng,
    radiusKm
}: PublicationFiltersProps) {
    const [category, setCategory] = useState(selectedCategory?.toString() || 'all');
    const [type, setType] = useState(selectedType || 'all');
    const [minPrice, setMinPrice] = useState(selectedMinPrice?.toString() || '');
    const [maxPrice, setMaxPrice] = useState(selectedMaxPrice?.toString() || '');
    const [showPriceFilter, setShowPriceFilter] = useState(false);
    const [nearMe, setNearMe] = useState(!!nearLat && !!nearLng);
    const [radius, setRadius] = useState(radiusKm?.toString() || '10');
    const [isGettingLocation, setIsGettingLocation] = useState(false);

    // Sincronizar estado con props cuando cambien
    useEffect(() => {
        setCategory(selectedCategory?.toString() || 'all');
        setType(selectedType || 'all');
        setMinPrice(selectedMinPrice?.toString() || '');
        setMaxPrice(selectedMaxPrice?.toString() || '');
        setNearMe(!!nearLat && !!nearLng);
        setRadius(radiusKm?.toString() || '10');
    }, [selectedCategory, selectedType, selectedMinPrice, selectedMaxPrice, nearLat, nearLng, radiusKm]);

    const getCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocalización no está soportada por este navegador.');
            return;
        }

        setIsGettingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setNearMe(true);
                applyFilters(category, type, minPrice, maxPrice, latitude, longitude, radius);
                setIsGettingLocation(false);
            },
            (error) => {
                console.error('Error obteniendo ubicación:', error);
                alert('No se pudo obtener tu ubicación actual.');
                setIsGettingLocation(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000, // 5 minutos
            }
        );
    };

    const applyFilters = (cat: string, typ: string, min: string, max: string, lat?: number, lng?: number, rad?: string) => {
        const query: Record<string, string | null> = {};
        
        if (cat !== 'all') query.category_id = cat;
        if (typ !== 'all') query.type = typ;
        if (min) query.min_price = min;
        if (max) query.max_price = max;
        if (lat && lng && rad) {
            query.near_lat = lat.toString();
            query.near_lng = lng.toString();
            query.radius_km = rad;
        }

        router.get('/publication', query, {
            preserveState: true,
            replace: true,
        });
    };

    const handleFilterChange = (newCategory: string, newType: string) => {
        setCategory(newCategory);
        setType(newType);
        // Mantener filtros de ubicación si están activos
        if (nearMe && nearLat && nearLng) {
            applyFilters(newCategory, newType, minPrice, maxPrice, nearLat, nearLng, radius);
        } else {
            applyFilters(newCategory, newType, minPrice, maxPrice);
        }
    };

    const handlePriceFilter = () => {
        // Mantener filtros de ubicación si están activos
        if (nearMe && nearLat && nearLng) {
            applyFilters(category, type, minPrice, maxPrice, nearLat, nearLng, radius);
        } else {
            applyFilters(category, type, minPrice, maxPrice);
        }
    };

    const handleNearMeToggle = () => {
        if (nearMe) {
            setNearMe(false);
            applyFilters(category, type, minPrice, maxPrice);
        } else {
            getCurrentLocation();
        }
    };

    const handleRadiusChange = (newRadius: string) => {
        setRadius(newRadius);
        if (nearMe && nearLat && nearLng) {
            applyFilters(category, type, minPrice, maxPrice, nearLat, nearLng, newRadius);
        }
    };

    const clearFilters = () => {
        setCategory('all');
        setType('all');
        setMinPrice('');
        setMaxPrice('');
        setNearMe(false);
        setRadius('10');
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
                        onClick={handleNearMeToggle}
                        disabled={isGettingLocation}
                        className={`flex items-center gap-2 ${
                            nearMe 
                                ? 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200' 
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                    >
                        {isGettingLocation ? (
                            <>
                                <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                                Obteniendo...
                            </>
                        ) : (
                            <>
                                <MapPin className="h-4 w-4" />
                                {nearMe ? 'Cerca de mí' : 'Cerca de mí'}
                            </>
                        )}
                    </Button>
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

            {/* Filtro de ubicación - visible cuando está activo */}
            {nearMe && (
                <div className="border-t pt-4 mt-4">
                    <div className="flex items-center justify-between mb-3">
                        <Label className="text-lg font-semibold text-gray-900">Filtrar por proximidad</Label>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setNearMe(false)}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="max-w-sm">
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">Radio de búsqueda</Label>
                        <div className="flex items-center gap-3">
                            <input
                                type="range"
                                min="1"
                                max="50"
                                value={radius}
                                onChange={(e) => handleRadiusChange(e.target.value)}
                                className="flex-1"
                            />
                            <span className="text-sm font-medium text-gray-700 min-w-[3rem]">
                                {radius} km
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Mostrando publicaciones dentro de {radius} km de tu ubicación
                        </p>
                    </div>
                </div>
            )}

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