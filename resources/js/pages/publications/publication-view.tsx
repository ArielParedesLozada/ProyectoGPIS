import AppLayout from "@/layouts/app-layout";
import { publicationView } from "@/routes";
import { BreadcrumbItem, Publication } from "@/types";
import { Head } from "@inertiajs/react";

interface PublicationViewProps {
    publication: Publication
}

export default function PublicationView({ publication }: PublicationViewProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: `${publication.category.name}/${publication.title}`,
            href: publicationView(publication).url,
        },
    ];
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={publication.title} />

            <div
                key={publication.id}
                className="bg-white rounded-lg shadow hover:shadow-md transition p-4 flex flex-col "
            >
                <img
                    src={publication.image || "https://picsum.photos/200/160"}
                    alt={publication.title}
                    className="rounded-md mb-3 w-full h-40 object-cover"
                />

                <div className="flex-grow">
                    <h3 className="font-semibold text-lg mb-2">{publication.title}</h3>
                    <p className="text-gray-600 mb-3 line-clamp-2">{publication.description}</p>

                    <div className="space-y-2 text-sm text-gray-700">
                        <div className="flex justify-between">
                            <span className="font-medium">Precio:</span>
                            <span className="text-blue-600 font-bold">${publication.price}</span>
                        </div>

                        <div className="flex justify-between">
                            <span className="font-medium">Código:</span>
                            <span className="text-gray-500">{publication.code}</span>
                        </div>

                        <div className="flex justify-between">
                            <span className="font-medium">Tipo:</span>
                            <span className={`px-2 py-1 rounded-full text-xs ${publication.type === 'servicio'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-blue-100 text-blue-800'
                                }`}>
                                {publication.type}
                            </span>
                        </div>

                        <div className="flex justify-between">
                            <span className="font-medium">Estado:</span>
                            <span className={`px-2 py-1 rounded-full text-xs ${publication.status === 1
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                                }`}>
                                {publication.status === 1 ? "Habilitado" : "Deshabilitado"}
                            </span>
                        </div>

                        <div className="flex justify-between">
                            <span className="font-medium">Disponibilidad:</span>
                            <span className={publication.disponibility ? "text-green-600" : "text-red-600"}>
                                {publication.disponibility ? "Disponible" : "No disponible"}
                            </span>
                        </div>

                        {publication.horario && (
                            <div className="flex justify-between">
                                <span className="font-medium">Horario:</span>
                                <span className="text-gray-500">
                                    {new Date(publication.horario).toLocaleDateString()}
                                </span>
                            </div>
                        )}

                        <div className="flex justify-between">
                            <span className="font-medium">Publicado:</span>
                            <span className="text-gray-500">
                                {new Date(publication.published_at).toLocaleDateString()}
                            </span>
                        </div>

                        {/* {publication.location && (
                            <div className="flex justify-between">
                                <span className="font-medium">Ubicación:</span>
                                <span className="text-gray-500">
                                    {publication.location.coordinates
                                        ? `Lat: ${publication.location.coordinates[1]?.toFixed(4)}, Lng: ${publication.location.coordinates[0]?.toFixed(4)}`
                                        : 'Coordenadas disponibles'
                                    }
                                </span>
                            </div>
                        )} */}

                        {publication.category && (
                            <div className="flex justify-between">
                                <span className="font-medium">Categoría:</span>
                                <span className="text-gray-500">{publication.category.name}</span>
                            </div>
                        )}

                        {publication.user.name && (
                            <div className="flex justify-between">
                                <span className="font-medium">Creado por:</span>
                                <span className="text-gray-500">{publication.user.name}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    )
}