import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { router } from '@inertiajs/react';
import { Filter, MapPin, X } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import NearMeFilterModal from './near-me-filter-modal';

interface PublicationFiltersProps {
    categories: Array<{ id: number; name: string }>;
    selectedCategory?: number;
    selectedCategories?: number[];
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
    selectedCategories: initialSelectedCategories,
    selectedType,
    selectedMinPrice,
    selectedMaxPrice,
    nearLat,
    nearLng,
    radiusKm,
    myProducts
}: PublicationFiltersProps) {
    const { showToast } = useToast();
    const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
    const [type, setType] = useState(selectedType || 'all');
    const [minPrice, setMinPrice] = useState(selectedMinPrice?.toString() || '');
    const [maxPrice, setMaxPrice] = useState(selectedMaxPrice?.toString() || '');
    const [showPriceFilter, setShowPriceFilter] = useState(false);
    const [nearMe, setNearMe] = useState(!!nearLat && !!nearLng);
    const [radius, setRadius] = useState(radiusKm?.toString() || '10');
    const [isGettingLocation, setIsGettingLocation] = useState(false);
    const [showFilters, setShowFilters] = useState(true);
    const [myProductsFilter, setMyProductsFilter] = useState(myProducts || false);
    const [showNearMeModal, setShowNearMeModal] = useState(false);

    // Sincronizar estado con props cuando cambien
    useEffect(() => {
        if (initialSelectedCategories) {
            setSelectedCategories(initialSelectedCategories);
        } else if (selectedCategory) {
            setSelectedCategories([selectedCategory]);
        } else {
            setSelectedCategories([]);
        }
        setType(selectedType || 'all');
        setMinPrice(selectedMinPrice?.toString() || '');
        setMaxPrice(selectedMaxPrice?.toString() || '');
        setNearMe(!!nearLat && !!nearLng);
        setRadius(radiusKm?.toString() || '10');
        setMyProductsFilter(myProducts || false);
    }, [initialSelectedCategories, selectedCategory, selectedType, selectedMinPrice, selectedMaxPrice, nearLat, nearLng, radiusKm, myProducts]);

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
        return selectedCategories.length > 0 || 
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
                applyFilters(selectedCategories, type, minPrice, maxPrice, latitude, longitude, radius, myProductsFilter);
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
                maximumAge: 60000
            }
        );
    };

    const applyFilters = (
        categories: number[], 
        type: string, 
        minPrice: string, 
        maxPrice: string, 
        lat?: number, 
        lng?: number, 
        radius?: string, 
        myProducts?: boolean
    ) => {
        const query: Record<string, string | null> = {};

        // Categorías múltiples
        if (categories.length > 0) {
            query.categories = categories.join(',');
        }

        if (type !== 'all') query.type = type;
        if (minPrice) query.min_price = minPrice;
        if (maxPrice) query.max_price = maxPrice;
        if (lat && lng) {
            query.near_lat = lat.toString();
            query.near_lng = lng.toString();
            query.radius_km = radius || '10';
        }
        if (myProducts) query.my_products = 'true';

        router.get("/publication", query, {
            preserveState: true,
            replace: true,
        });
    };

    const handleCategoryChange = (categoryId: number, checked: boolean) => {
        let newCategories;
        if (checked) {
            newCategories = [...selectedCategories, categoryId];
        } else {
            newCategories = selectedCategories.filter(id => id !== categoryId);
        }
        setSelectedCategories(newCategories);
        applyFilters(newCategories, type, minPrice, maxPrice, nearLat, nearLng, radius, myProductsFilter);
    };

    const handleFilterChange = (newType: string) => {
        setType(newType);
        applyFilters(selectedCategories, newType, minPrice, maxPrice, nearLat, nearLng, radius, myProductsFilter);
    };

    const handlePriceFilter = () => {
        if (minPrice && maxPrice) {
            applyFilters(selectedCategories, type, minPrice, maxPrice, nearLat, nearLng, radius, myProductsFilter);
        } else {
            showToast({
                type: 'error',
                title: 'Error',
                message: 'Debes ingresar tanto el precio mínimo como el máximo'
            });
        }
    };

    const handleNearMeToggle = () => {
        if (nearMe) {
            setNearMe(false);
            applyFilters(selectedCategories, type, minPrice, maxPrice, undefined, undefined, undefined, myProductsFilter);
        } else {
            setShowNearMeModal(true);
        }
    };

    const handleNearMeApply = (lat: number, lng: number, newRadius: number) => {
        setNearMe(true);
        setRadius(newRadius.toString());
        applyFilters(selectedCategories, type, minPrice, maxPrice, lat, lng, newRadius.toString(), myProductsFilter);
    };

    const handleRadiusChange = (newRadius: string) => {
        setRadius(newRadius);
        if (nearMe && nearLat && nearLng) {
            applyFilters(selectedCategories, type, minPrice, maxPrice, nearLat, nearLng, newRadius, myProductsFilter);
        }
    };

    const handleRadiusClick = () => {
        if (nearMe) {
            setShowNearMeModal(true);
        }
    };

    const clearAllFilters = () => {
        setSelectedCategories([]);
        setType('all');
        setMinPrice('');
        setMaxPrice('');
        setNearMe(false);
        setRadius('10');
        setMyProductsFilter(false);
        router.get("/publication", {}, {
            preserveState: true,
            replace: true,
        });
    };

    return (
        <div className="space-y-6">
            {/* Categorías con checkboxes */}
            <div className="space-y-3">
                <Label className="text-sm font-semibold text-gray-700">Categorías</Label>
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                    {categories.map((cat) => (
                        <div key={cat.id} className="flex items-center space-x-2">
                            <Checkbox
                                id={`category-${cat.id}`}
                                checked={selectedCategories.includes(cat.id)}
                                onCheckedChange={(checked) => handleCategoryChange(cat.id, checked as boolean)}
                            />
                            <Label 
                                htmlFor={`category-${cat.id}`}
                                className="text-sm text-gray-700 cursor-pointer"
                            >
                                {cat.name}
                            </Label>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tipo */}
            <div className="space-y-3">
                <Label className="text-sm font-semibold text-gray-700">Tipo</Label>
                <Select value={type} onValueChange={handleFilterChange}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecciona un tipo" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los tipos</SelectItem>
                        <SelectItem value="producto">Producto</SelectItem>
                        <SelectItem value="servicio">Servicio</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Precio */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold text-gray-700">Precio</Label>
                    <Button
                        variant="link"
                        onClick={() => setShowPriceFilter(!showPriceFilter)}
                        className="text-blue-600 hover:text-blue-800 p-0 h-auto text-xs"
                    >
                        {showPriceFilter ? 'Ocultar' : 'Mostrar'}
                    </Button>
                </div>
                
                {showPriceFilter && (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="min-price" className="text-xs text-gray-600">Precio mínimo</Label>
                                <Input
                                    id="min-price"
                                    type="number"
                                    placeholder="0"
                                    value={minPrice}
                                    onChange={(e) => setMinPrice(e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="max-price" className="text-xs text-gray-600">Precio máximo</Label>
                                <Input
                                    id="max-price"
                                    type="number"
                                    placeholder="1000"
                                    value={maxPrice}
                                    onChange={(e) => setMaxPrice(e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                        </div>
                        <Button
                            onClick={handlePriceFilter}
                            className="w-full"
                            disabled={!minPrice || !maxPrice}
                        >
                            Aplicar Filtro de Precio
                        </Button>
                    </div>
                )}
            </div>

            {/* Mis Productos */}
            <div className="space-y-3">
                <Label className="text-sm font-semibold text-gray-700">Mis Productos</Label>
                <Select 
                    value={myProductsFilter ? 'my' : 'all'} 
                    onValueChange={(value) => {
                        const newValue = value === 'my';
                        setMyProductsFilter(newValue);
                        applyFilters(selectedCategories, type, minPrice, maxPrice, nearLat, nearLng, radius, newValue);
                    }}
                >
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecciona productos" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los productos</SelectItem>
                        <SelectItem value="my">Solo mis productos</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Ubicación */}
            <div className="space-y-3">
                <Label className="text-sm font-semibold text-gray-700">Ubicación</Label>
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
                        <div 
                            className="flex items-center gap-3 cursor-pointer p-2 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                            onClick={handleRadiusClick}
                        >
                            <input
                                type="range"
                                min="1"
                                max="50"
                                value={radius}
                                onChange={(e) => handleRadiusChange(e.target.value)}
                                className="flex-1 cursor-pointer"
                                onClick={(e) => e.stopPropagation()}
                            />
                            <span className="text-sm font-medium text-gray-700 min-w-[3rem]">
                                {radius} km
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Mostrando publicaciones dentro de {radius} km de tu ubicación
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                            Haz clic para ajustar la ubicación en el mapa
                        </p>
                    </div>
                )}
            </div>

            {/* Botón para limpiar filtros */}
            {hasActiveFilters() && (
                <div className="pt-4 border-t border-gray-200">
                    <Button
                        onClick={clearAllFilters}
                        variant="outline"
                        className="w-full flex items-center gap-2 text-gray-600 hover:text-gray-800"
                    >
                        <X className="h-4 w-4" />
                        Limpiar Filtros
                    </Button>
                </div>
            )}

            {/* Modal de filtro "Cerca de mí" */}
            <NearMeFilterModal
                isOpen={showNearMeModal}
                onClose={() => setShowNearMeModal(false)}
                onApply={handleNearMeApply}
                currentLat={nearLat}
                currentLng={nearLng}
                currentRadius={parseInt(radius)}
            />
        </div>
    );
}
