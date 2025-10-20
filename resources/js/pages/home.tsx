import ProductList from "@/components/products/products-list";
import AppLayout from "@/layouts/app-layout";
import { SharedData } from "@/types";
import { usePage } from "@inertiajs/react";
//resources/js/pages/home.tsx
export default function Home() {
    const { auth, products } = usePage<SharedData>().props;

    return (
        <AppLayout>
            <div className="p-6">
                <h1 className="text-2xl font-bold mb-4">
                    Bienvenido, {auth.user.name}
                </h1>
                {products ? (
                    <ProductList products={products} />
                ) : (
                    <p className="text-gray-600">No hay productos disponibles.</p>
                )}
            </div>
        </AppLayout>
    )
}