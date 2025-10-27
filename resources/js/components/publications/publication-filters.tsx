import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { router } from '@inertiajs/react';
import { Filter, MapPin, X } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface PublicationFiltersProps {
    categories: Array<{ id: number; name: string }>;
    selectedCategory?: number;
    selectedType?: string;
    selectedMinPrice?: number;
    selectedMaxPrice?: number;
    nearLat?: number;
    nearLng?: number;
    radiusKm?: number;
    myProducts?: boolean;
}

export default function PublicationFilters({ 
    categories, 
    selectedCategory, 
    selectedType,
    selectedMinPrice,
    selectedMaxPrice,
    nearLat,
    nearLng,
    radiusKm,
    myProducts
}: PublicationFiltersProps) {
    const { showToast } = useToast();
    const [category, setCategory] = useState(selectedCategory?.toString() || 'all');
    const [type, setType] = useState(selectedType || 'all');
    const [minPrice, setMinPrice] = useState(selectedMinPrice?.toString() || '');
    const [maxPrice, setMaxPrice] = useState(selectedMaxPrice?.toString() || '');
    const [showPriceFilter, setShowPriceFilter] = useState(false);
    const [nearMe, setNearMe] = useState(!!nearLat && !!nearLng);
    const [radius, setRadius] = useState(radiusKm?.toString() || '10');
    const [isGettingLocation, setIsGettingLocation] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [myProductsFilter, setMyProductsFilter] = useState(myProducts || false);

    // Sincronizar estado con props cuando cambien
    useEffect(() => {
        setCategory(selectedCategory?.toString() || 'all');
        setType(selectedType || 'all');
        setMinPrice(selectedMinPrice?.toString() || '');
        setMaxPrice(selectedMaxPrice?.toString() || '');
        setNearMe(!!nearLat && !!nearLng);
        setRadius(radiusKm?.toString() || '10');
        setMyProductsFilter(myProducts || false);
    }, [selectedCategory, selectedType, selectedMinPrice, selectedMaxPrice, nearLat, nearLng, radiusKm, myProducts]);

    // Mostrar alerta cuando se ingresa precio mínimo sin máximo
    useEffect(() => {
        if (minPrice && !maxPrice && minPrice !== selectedMinPrice?.toString()) {
            const timeoutId = setTimeout(() => {
                showToast({
                    type: 'info',
                    title: 'Filtro incompleto',
                    message: 'Para filtrar por precio, también ingresa el precio máximo'
                });
            }, 1000); // Esperar 1 segundo después de escribir

            return () => clearTimeout(timeoutId);
        }
    }, [minPrice, maxPrice, selectedMinPrice, showToast]);

    // Verificar si hay filtros activos
    const hasActiveFilters = () => {
        return category !== 'all' || 
               type !== 'all' || 
               minPrice !== '' || 
               maxPrice !== '' || 
               nearMe ||
               myProductsFilter;
    };

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
                // Aplicar filtros inmediatamente con la ubicación obtenida
                applyFilters(category, type, minPrice, maxPrice, latitude, longitude, radius, myProductsFilter);
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

    const applyFilters = (cat: string, typ: string, min: string, max: string, lat?: number, lng?: number, rad?: string, myProd?: boolean) => {
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
        if (myProd) query.my_products = 'true';

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
            applyFilters(newCategory, newType, minPrice, maxPrice, nearLat, nearLng, radius, myProductsFilter);
        } else {
            applyFilters(newCategory, newType, minPrice, maxPrice, undefined, undefined, undefined, myProductsFilter);
        }
    };

    const handlePriceFilter = () => {
        // Mostrar alerta si solo se ingresa precio mínimo
        if (minPrice && !maxPrice) {
            showToast({
                type: 'info',
                title: 'Filtro incompleto',
                message: 'Para filtrar por precio, también ingresa el precio máximo'
            });
            return;
        }
        
        // Mostrar alerta si solo se ingresa precio máximo
        if (!minPrice && maxPrice) {
            showToast({
                type: 'info',
                title: 'Filtro incompleto',
                message: 'Para filtrar por precio, también ingresa el precio mínimo'
            });
            return;
        }

        // Mantener filtros de ubicación si están activos
        if (nearMe && nearLat && nearLng) {
            applyFilters(category, type, minPrice, maxPrice, nearLat, nearLng, radius, myProductsFilter);
        } else {
            applyFilters(category, type, minPrice, maxPrice, undefined, undefined, undefined, myProductsFilter);
        }
    };

    const handleNearMeToggle = () => {
        if (nearMe) {
            setNearMe(false);
            applyFilters(category, type, minPrice, maxPrice, undefined, undefined, undefined, myProductsFilter);
        } else {
            getCurrentLocation();
        }
    };

    const handleRadiusChange = (newRadius: string) => {
        setRadius(newRadius);
        if (nearMe && nearLat && nearLng) {
            applyFilters(category, type, minPrice, maxPrice, nearLat, nearLng, newRadius, myProductsFilter);
        }
    };

    const clearFilters = () => {
        setCategory('all');
        setType('all');
        setMinPrice('');
        setMaxPrice('');
        setNearMe(false);
        setRadius('10');
        setMyProductsFilter(false);
        router.get('/publication', {}, {
            preserveState: true,
            replace: true,
            onSuccess: () => {
                showToast({
                    type: 'success',
                    title: 'Filtros limpiados',
                    message: 'Se han eliminado todos los filtros aplicados'
                });
            }
        });
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            {/* Header de filtros */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Filtros</h2>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                >
                    <Filter className="w-4 h-4" />
                    {showFilters ? 'Ocultar' : 'Mostrar'} Filtros
                </button>
            </div>

            {/* Filtros principales - siempre visibles */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {/* Categoría */}
                <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-2">Categoría</Label>
                    <Select 
                        value={category} 
                        onValueChange={(value) => handleFilterChange(value, type)}
                    >
                        <SelectTrigger className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
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
                
                {/* Tipo */}
                <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-2">Tipo</Label>
                    <Select 
                        value={type} 
                        onValueChange={(value) => handleFilterChange(category, value)}
                    >
                        <SelectTrigger className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <SelectValue placeholder="Todos los tipos" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los tipos</SelectItem>
                            <SelectItem value="producto">Producto</SelectItem>
                            <SelectItem value="servicio">Servicio</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Mis Productos */}
                <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-2">Mis Productos</Label>
                    <Select 
                        value={myProductsFilter ? 'true' : 'false'} 
                        onValueChange={(value) => {
                            const isMyProducts = value === 'true';
                            setMyProductsFilter(isMyProducts);
                            // Mantener filtros de ubicación si están activos
                            if (nearMe && nearLat && nearLng) {
                                applyFilters(category, type, minPrice, maxPrice, nearLat, nearLng, radius, isMyProducts);
                            } else {
                                applyFilters(category, type, minPrice, maxPrice, undefined, undefined, undefined, isMyProducts);
                            }
                        }}
                    >
                        <SelectTrigger className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <SelectValue placeholder="Todos los productos" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="false">Todos los productos</SelectItem>
                            <SelectItem value="true">Mis productos comprados</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Filtros avanzados - ocultos por defecto */}
            {showFilters && (
                <div className="border-t pt-4 mb-4">
                    <h3 className="text-md font-semibold text-gray-700 mb-4">Filtros Avanzados</h3>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Sección de Precio */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-gray-600">Filtro por Precio</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="block text-sm font-medium text-gray-700 mb-2">Precio mínimo</Label>
                                    <Input
                                        type="number"
                                        placeholder="$0"
                                        value={minPrice}
                                        onChange={(e) => setMinPrice(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <Label className="block text-sm font-medium text-gray-700 mb-2">Precio máximo</Label>
                                    <Input
                                        type="number"
                                        placeholder="$1000"
                                        value={maxPrice}
                                        onChange={(e) => setMaxPrice(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                            <Button 
                                onClick={handlePriceFilter}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-4"
                            >
                                Aplicar filtro de precio
                            </Button>
                        </div>

                        {/* Sección de Ubicación */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-gray-600">Filtro por Proximidad</h4>
                            <div className="space-y-3">
                                <Button
                                    variant="outline"
                                    onClick={handleNearMeToggle}
                                    disabled={isGettingLocation}
                                    className={`w-full flex items-center justify-center gap-2 ${
                                        nearMe 
                                            ? 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200' 
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                                >
                                    {isGettingLocation ? (
                                        <>
                                            <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                                            Obteniendo ubicación...
                                        </>
                                    ) : (
                                        <>
                                            <MapPin className="h-4 w-4" />
                                            {nearMe ? 'Desactivar ubicación' : 'Buscar cerca de mí'}
                                        </>
                                    )}
                                </Button>
                                
                                {/* Radio de búsqueda - solo visible cuando está activo */}
                                {nearMe && (
                                    <div>
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
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Botón de limpiar filtros */}
            <div className="flex justify-end">
                <button
                    onClick={hasActiveFilters() ? clearFilters : undefined}
                    disabled={!hasActiveFilters()}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                        hasActiveFilters()
                            ? 'bg-blue-100 hover:bg-blue-200 text-blue-700 cursor-pointer'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                    title={!hasActiveFilters() ? 'No hay filtros activos para limpiar' : ''}
                >
                    <X className="w-4 h-4" />
                    Limpiar Filtros
                </button>
            </div>

        </div>
    );
}