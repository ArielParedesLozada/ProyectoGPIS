import PublicationList from "@/components/publications/publications-list";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AppLayout from "@/layouts/app-layout";
import { publicationIndex } from "@/routes";
import { SharedData, Paginated, Publication, Category, BreadcrumbItem } from "@/types";
import { usePage, router, Head } from "@inertiajs/react";
import { useState } from "react";

export default function PublicationIndex() {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Publicaciones',
            href: publicationIndex().url,
        },
    ];
    const { auth, publications, categories, selectedCategory, selectedType } = usePage<SharedData & {
        publications: Paginated<Publication>,
        categories: Category[],
        selectedCategory?: number;
        selectedType?: string;
    }>().props;

    const [category, setCategory] = useState(selectedCategory || 'all');
    const [type, setType] = useState(selectedType || "all");


    const handleFilterChange = (newCategory: string, newType: string) => {
        setCategory(newCategory);
        setType(newType)
        const query: Record<string, string | null> = {};

        if (newCategory !== "all") query.category_id = newCategory;
        if (newType !== "all") query.type = newType;

        router.get("/publication", query, {
            preserveState: true,
            replace: true,
        });
    };

    const clearFilters = () => {
        setCategory("all");
        setType("all");
        router.get("/publication", {}, {
            preserveState: true,
            replace: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Publicaciones" />
            <div className="p-6">
                <h1 className="text-2xl font-bold mb-4">
                    Bienvenido, {auth.user.name}
                </h1>

                <div className="mb-6 bg-white p-4 rounded-lg shadow">
                    <div className="flex items-center gap-4 flex-wrap">
                        {/* FILTRO POR CATEGORÍA */}
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="category" className="font-medium text-gray-700">
                                Filtrar por categoría:
                            </Label>
                            <Select
                                value={category.toString()}
                                onValueChange={(value) =>
                                    handleFilterChange(value, type)
                                }
                            >
                                <SelectTrigger className="w-64 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                    <SelectValue placeholder="Todas las categorías" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border border-gray-300 rounded-lg shadow-lg">
                                    <SelectItem value="all">Todas las categorías</SelectItem>
                                    {categories?.map((cat) => (
                                        <SelectItem
                                            key={cat.id}
                                            value={cat.id.toString()}
                                            className="text-gray-900 hover:bg-gray-100"
                                        >
                                            {cat.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* FILTRO POR TIPO */}
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="type" className="font-medium text-gray-700">
                                Filtrar por tipo:
                            </Label>
                            <Select
                                value={type}
                                onValueChange={(value) =>
                                    handleFilterChange(category.toString(), value)
                                }
                            >
                                <SelectTrigger className="w-64 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                    <SelectValue placeholder="Todos los tipos" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border border-gray-300 rounded-lg shadow-lg">
                                    <SelectItem value="all">Todos los tipos</SelectItem>
                                    <SelectItem value="producto">Producto</SelectItem>
                                    <SelectItem value="servicio">Servicio</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {(category !== "all" || type !== "all") && (
                            <button
                                onClick={clearFilters}
                                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors self-end"
                            >
                                Limpiar filtros
                            </button>
                        )}                    </div>
                </div>

                {publications.data.length > 0 ? (
                    <PublicationList publications={publications} />
                ) : (
                    <p className="text-gray-600">No hay productos disponibles.</p>
                )}
            </div>
        </AppLayout>
    );
}
