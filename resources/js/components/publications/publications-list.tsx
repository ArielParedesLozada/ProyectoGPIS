import { Link } from "@inertiajs/react";
import { Paginated, Publication, Category } from "@/types";
import PublicationCard from "./publication-card";
import PublicationFilters from "./publication-filters";

interface PublicationListProps {
    publications: Paginated<Publication>;
    categories: Category[];
    selectedCategory?: number;
    selectedType?: string;
    selectedMinPrice?: number;
    selectedMaxPrice?: number;
    nearLat?: number;
    nearLng?: number;
    radiusKm?: number;
}

export default function PublicationList({ 
    publications, 
    categories, 
    selectedCategory, 
    selectedType,
    selectedMinPrice,
    selectedMaxPrice,
    nearLat,
    nearLng,
    radiusKm
}: PublicationListProps) {
    return (
        <div className="bg-background min-h-screen">
            {/* Header con título y contador */}
            <div className="bg-card border-b border-border px-6 py-8">
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold text-foreground mb-2">Marketplace</h1>
                            <p className="text-muted-foreground">Descubre productos y servicios de múltiples vendedores</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-muted-foreground">{publications.data.length} productos encontrados</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filtros unificados */}
            <div className="bg-card border-b border-border px-6 py-4">
                <div className="max-w-7xl mx-auto">
                    <PublicationFilters 
                        categories={categories}
                        selectedCategory={selectedCategory}
                        selectedType={selectedType}
                        selectedMinPrice={selectedMinPrice}
                        selectedMaxPrice={selectedMaxPrice}
                        nearLat={nearLat}
                        nearLng={nearLng}
                        radiusKm={radiusKm}
                    />
                </div>
            </div>

            {/* Grid de productos */}
            <div className="max-w-7xl mx-auto px-6 py-8">
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
            </div>
        </div>
    );
}
