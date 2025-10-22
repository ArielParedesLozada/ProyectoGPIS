import { publicationView } from "@/routes";
import { Publication } from "@/types";
import { Link } from "@inertiajs/react";
import { Label } from "../ui/label";

interface PublicationCardProps {
    publication: Publication
}

export default function PublicationCard({ publication }: PublicationCardProps) {
    return (
        <Link href={publicationView(publication.id)} className="group">
            <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 overflow-hidden h-full flex flex-col">
                {/* Imagen del producto */}
                <div className="relative">
                    <img
                        src={publication.image || "https://picsum.photos/300/200"}
                        alt={publication.title}
                        className="w-full h-48 object-cover"
                    />
                    {/* Badge de categoría - esquina superior izquierda */}
                    <div className="absolute top-3 left-3">
                        <span className="bg-gray-200 text-gray-800 text-xs font-medium px-2 py-1 rounded-full">
                            {publication.category.name}
                        </span>
                    </div>
                </div>

                {/* Contenido de la card */}
                <div className="p-4 flex flex-col flex-grow">
                    {/* Título */}
                    <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2">
                        {publication.title}
                    </h3>
                    
                    {/* Ubicación con icono */}
                    <div className="flex items-center mb-3">
                        <svg className="w-4 h-4 text-red-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-500 text-sm">San José</span>
                    </div>

                    {/* Precio y botón - siempre al final */}
                    <div className="flex items-center justify-between mt-auto">
                        <p className="text-2xl font-bold text-gray-900">${publication.price}</p>
                        <button className="bg-gray-200 text-gray-800 px-3 py-1 rounded text-sm font-medium">
                            Disponible
                        </button>
                    </div>
                </div>
            </div>
        </Link>
    )
}