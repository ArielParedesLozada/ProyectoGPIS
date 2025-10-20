import PublicationList from "@/components/publications/publications-list";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AppLayout from "@/layouts/app-layout";
import { SharedData, Paginated, Publication, Category } from "@/types";
import { usePage, router } from "@inertiajs/react";
import { useState } from "react";

export default function PublicationIndex() {
    const { auth, publications, categories, selectedCategory } = usePage<SharedData & {
        publications: Paginated<Publication>,
        categories: Category[],
        selectedCategory?: number,
    }>().props;

    const [category, setCategory] = useState(selectedCategory || '');

    const handleFilter = (categoryId: string) => {
        setCategory(categoryId);
        router.get('/publication', { category_id: categoryId || null }, {
            preserveState: true,
            replace: true
        });
    };

    const clearFilter = () => {
        setCategory('');
        router.get('/publication', {}, {
            preserveState: true,
            replace: true
        });
    };

    return (
        <AppLayout>
            <div className="p-6">
                <h1 className="text-2xl font-bold mb-4">
                    Bienvenido, {auth.user.name}
                </h1>

                <div className="mb-6 bg-white p-4 rounded-lg shadow">
                    <div className="flex items-center gap-4 flex-wrap">
                        <Label htmlFor="category" className="font-medium text-gray-700">
                            Filtrar por categoría:
                        </Label>
                        <Select
                            value={category.toString() || "all"}
                            onValueChange={(value) => {
                                if (value === "all") handleFilter("");
                                else handleFilter(value);
                            }}                        >
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

                        {category && (
                            <button
                                onClick={clearFilter}
                                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                            >
                                Limpiar filtro
                            </button>
                        )}
                    </div>
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
