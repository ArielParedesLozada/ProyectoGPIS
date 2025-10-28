import { Link } from "@inertiajs/react";
import { Paginated, Publication, Category } from "@/types";
import PublicationCard from "./publication-card";
import EmptyState from "@/components/ui/empty-state";
import StickyToolbar from "./sticky-toolbar";
import FiltersDrawer, { FILTER_PANEL_WIDTH_PX } from "./filters-drawer";
import { Plus } from "lucide-react";
import { useState } from "react";

interface PublicationListProps {
    publications: Paginated<Publication>;
    categories: Category[];
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

export default function PublicationList({ 
    publications, 
    categories, 
    selectedCategory, 
    selectedCategories,
    selectedType,
    selectedMinPrice,
    selectedMaxPrice,
    nearLat,
    nearLng,
    radiusKm,
    myProducts
}: PublicationListProps) {
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);

    return (
        <div className="bg-background min-h-screen">
            {/* Header con título */}
            <div className="bg-card border-b border-border px-6 py-8">
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold text-foreground mb-2">Marketplace</h1>
                            <p className="text-muted-foreground">Descubre productos y servicios de múltiples vendedores</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Barra superior sticky */}
            <StickyToolbar
                totalResults={publications.total}
                selectedCategory={selectedCategory}
                selectedCategories={selectedCategories}
                selectedType={selectedType}
                selectedMinPrice={selectedMinPrice}
                selectedMaxPrice={selectedMaxPrice}
                nearLat={nearLat}
                nearLng={nearLng}
                radiusKm={radiusKm}
                categories={categories}
                onOpenFilters={() => setIsFiltersOpen(true)}
                isFiltersOpen={isFiltersOpen}
            />

            {/* Contenedor principal */}
            <div>
                {/* Grid de productos o Empty State */}
                <div className="max-w-7xl mx-auto px-6 py-8">
                    {publications.data.length > 0 ? (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {publications.data.map((p, _) => (
                                    <PublicationCard key={_} publication={p} />
                                ))}
                            </div>

                            {/* Paginación */}
                            <div className="flex justify-center mt-8">
                                <div className="flex items-center gap-2">
                                    {publications.links.map((link, i) =>
                                        link.url ? (
                                            <Link
                                                key={i}
                                                href={link.url}
                                                className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
                                                    link.active 
                                                        ? "bg-primary text-primary-foreground border-primary" 
                                                        : "text-foreground border-border hover:bg-muted hover:border-border"
                                                }`}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        ) : (
                                            <span
                                                key={i}
                                                className="px-4 py-2 text-muted-foreground cursor-not-allowed text-sm"
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        )
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        // Detectar si hay filtros activos
                        (() => {
                            const hasActiveFilters = selectedCategory || selectedType || selectedMinPrice || selectedMaxPrice || nearLat || myProducts;
                            
                            if (hasActiveFilters) {
                                // Hay filtros aplicados
                                return (
                                    <EmptyState
                                        icon={Plus}
                                        title="No hay publicaciones"
                                        description="No se encontraron publicaciones con los filtros aplicados"
                                        buttonText="Limpiar Filtros"
                                        buttonHref="/publication"
                                        buttonIcon={Plus}
                                        buttonVariant="default"
                                        buttonClassName="bg-gray-800 hover:bg-gray-900 text-white"
                                    />
                                );
                            } else {
                                // No hay filtros aplicados - no hay productos en general
                                return (
                                    <EmptyState
                                        icon={Plus}
                                        title="No hay publicaciones disponibles"
                                        description="Aún no hay publicaciones en el marketplace. Sé el primero en publicar algo"
                                        buttonText="Crear Publicación"
                                        buttonHref="/my-publications/create"
                                        buttonIcon={Plus}
                                        buttonVariant="default"
                                        buttonClassName="bg-gray-800 hover:bg-gray-900 text-white"
                                    />
                                );
                            }
                        })()
                    )}
                </div>
            </div>

            {/* Drawer de filtros */}
            <FiltersDrawer
                isOpen={isFiltersOpen}
                onClose={() => setIsFiltersOpen(false)}
                categories={categories}
                selectedCategory={selectedCategory}
                selectedCategories={selectedCategories}
                selectedType={selectedType}
                selectedMinPrice={selectedMinPrice}
                selectedMaxPrice={selectedMaxPrice}
                nearLat={nearLat}
                nearLng={nearLng}
                radiusKm={radiusKm}
                myProducts={myProducts}
            />
        </div>
    );
}
