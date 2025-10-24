import { publicationView } from "@/routes";
import { Publication } from "@/types";
import { Link } from "@inertiajs/react";
import { Label } from "../ui/label";
import { useState } from "react";
import ReportModal from "./report-modal";

interface PublicationCardProps {
    publication: Publication;
}

export default function PublicationCard({ publication }: PublicationCardProps) {
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    const handleReportClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsReportModalOpen(true);
    };

    return (
        <>
            <Link href={publicationView(publication.id)} className="group">
                <div className="bg-card rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden h-full flex flex-col relative">
                    {/* Imagen del producto */}
                    <div className="relative">
                        <img
                            src={
                                publication.images && publication.images.length > 0
                                    ? `/storage/${publication.images[0].image_url}`
                                    : "https://picsum.photos/300/200"
                            }
                            alt={publication.title}
                            className="w-full h-48 object-cover"
                        />

                        {/* Badge de categoría */}
                        <div className="absolute top-3 left-3">
                            <span className="bg-gray-200 text-gray-800 text-xs font-medium px-2 py-1 rounded-full">
                                {publication.category.name}
                            </span>
                        </div>

                        {/* Botón de reportar */}
                        <div className="absolute top-3 right-3 z-10">
                            <button
                                onClick={handleReportClick}
                                className="bg-gray-800 bg-opacity-80 text-white p-2 rounded-full hover:bg-opacity-100 transition-all duration-200 opacity-0 group-hover:opacity-100"
                                title="Reportar publicación"
                            >
                                <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Contenido de la card */}
                    <div className="p-4 flex flex-col flex-grow">
                        {/* Título */}
                        <h3 className="font-bold text-lg text-foreground mb-2 line-clamp-2">
                            {publication.title}
                        </h3>

                        {/* Ubicación */}
                        <div className="flex items-center mb-3">
                            <svg
                                className="w-4 h-4 text-red-500 mr-1"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            <span className="text-gray-500 text-sm">
                                {publication.location || "Ubicación no disponible"}
                            </span>
                        </div>

                        {/* Precio y botón */}
                        <div className="flex items-center justify-between mt-auto">
                            <p className="text-2xl font-bold text-foreground">
                                ${publication.price}
                            </p>
                            <button className="bg-gray-200 text-gray-800 px-3 py-1 rounded text-sm font-medium">
                                Disponible
                            </button>
                        </div>
                    </div>
                </div>
            </Link>

            {/* Modal de reporte */}
            <ReportModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                publicationId={publication.id}
                publicationTitle={publication.title}
            />
        </>
    );
}
