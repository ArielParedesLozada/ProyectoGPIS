import AppLayout from "@/layouts/app-layout";
import { Product } from "@/types";
import { Head } from "@inertiajs/react";

interface ProductViewProps {
    product: Product
}

export default function ProductView({ product }: ProductViewProps) {
    return (
        <AppLayout>
            <Head title={product.title} />

            <div className="max-w-3xl mx-auto bg-white rounded-xl shadow p-6 mt-6">
                <img
                    src={product.image || "https://picsum.photos/400/300"}
                    alt={product.title}
                    className="rounded-md mb-4 w-full h-64 object-cover"
                />
                <h1 className="text-2xl font-bold mb-2">{product.title}</h1>
                <p className="text-gray-600 mb-2">{product.description}</p>
                <p className="text-blue-600 font-bold mb-2">${product.price}</p>
                <p className="text-sm text-gray-500 mb-1">
                    Publicado por: {product.user?.name || "Desconocido"}
                </p>
                <p className="text-sm text-gray-500">
                    Categoría: {product.category?.name || "Sin categoría"}
                </p>
            </div>
        </AppLayout>
    )
}