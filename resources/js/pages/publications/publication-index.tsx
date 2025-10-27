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
    const { auth, publications, categories, selectedCategory, selectedType, selectedMinPrice, selectedMaxPrice, nearLat, nearLng, radiusKm, myProducts } = usePage<SharedData & {
        publications: Paginated<Publication>,
        categories: Category[],
        selectedCategory?: number;
        selectedType?: string;
        selectedMinPrice?: number;
        selectedMaxPrice?: number;
        nearLat?: number;
        nearLng?: number;
        radiusKm?: number;
        myProducts?: boolean;
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
            <PublicationList 
                publications={publications}
                categories={categories}
                selectedCategory={selectedCategory}
                selectedType={selectedType}
                selectedMinPrice={selectedMinPrice}
                selectedMaxPrice={selectedMaxPrice}
                nearLat={nearLat}
                nearLng={nearLng}
                radiusKm={radiusKm}
                myProducts={myProducts}
            />
        </AppLayout>
    );
}
