import { productView } from "@/routes";
import { Product } from "@/types";
import { Link } from "@inertiajs/react";

interface ProductCardProps {
    product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
    return (
        <Link href={productView(product.id)} className="group">
            <div
                key={product.id}
                className="bg-white rounded-lg shadow hover:shadow-md transition p-4 flex flex-col"
            >
                <img
                    src={product.image || "https://picsum.photos/200/160"}
                    alt={product.title}
                    className="rounded-md mb-3 w-full h-40 object-cover"
                />
                <h3 className="font-semibold text-lg">{product.title}</h3>
                <p className="text-gray-600 flex-grow">{product.description}</p>
                <p className="text-blue-600 font-bold mt-2">${product.price}</p>
                <button>Peek</button>
            </div>
        </Link>

    )
}