import AppLayout from "@/layouts/app-layout";
import { BreadcrumbItem, Publication } from "@/types";
import { Head, Link, router } from "@inertiajs/react";
import { ArrowLeft, Edit, Eye, EyeOff, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import MiniMap from "@/components/publications/MiniMap";
import DeleteConfirmationModal from "@/components/publications/delete-confirmation-modal";

interface MyPublicationViewProps {
  publication: Publication;
}

export default function MyPublicationView({ publication }: MyPublicationViewProps) {
  const breadcrumbs: BreadcrumbItem[] = [
    {
      title: `Mis Publicaciones/${publication.title}`,
      href: `/my-publications/${publication.id}`,
    },
  ];

  // Estado para el carrusel de imágenes
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Estado para el modal de confirmación de eliminación
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Array de imágenes - solo las imágenes reales de la publicación
  const images =
    publication.images && publication.images.length > 0
      ? publication.images.map((img) => `/storage/${img.image_url}`)
      : [];

  // Resetear el índice cuando cambien las imágenes
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [publication.images]);

  const nextImage = () => {
    if (images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }
  };

  const prevImage = () => {
    if (images.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    }
  };

  const handleDelete = () => {
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    setIsDeleting(true);
    router.delete(`/my-publications/${publication.id}`, {
      onSuccess: () => {
        setDeleteModalOpen(false);
        setIsDeleting(false);
      },
      onError: () => {
        setIsDeleting(false);
      }
    });
  };

  const handleCloseDeleteModal = () => {
    setDeleteModalOpen(false);
    setIsDeleting(false);
  };

  const handleToggleStatus = () => {
    router.patch(`/my-publications/${publication.id}/toggle-status`);
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={`${publication.title} - Mis Publicaciones`} />

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Columna izquierda - Imagen */}
            <div className="lg:col-span-2">
              {/* Flecha de regreso - posicionada absolutamente */}
              <Link
                href="/my-publications"
                className="absolute top-0 left-0 z-10 inline-flex items-center justify-center w-8 h-8 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>

              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="relative group">
                  {images.length > 0 ? (
                    <img
                      src={images[currentImageIndex]}
                      alt={publication.title}
                      className="w-full h-80 sm:h-96 lg:h-[510px] xl:h-[560px] object-cover transition-opacity duration-300"
                    />
                  ) : (
                    <div className="w-full h-80 sm:h-96 lg:h-[510px] xl:h-[560px] bg-gray-200 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-6xl text-gray-400 mb-4">📷</div>
                        <p className="text-gray-500 text-lg">Sin imágenes</p>
                        <p className="text-gray-400 text-sm">Esta publicación no tiene imágenes</p>
                      </div>
                    </div>
                  )}

                  {/* Controles del carrusel */}
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </>
                  )}

                  {/* Indicadores del carrusel */}
                  {images.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                      {images.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentImageIndex(index)}
                          className={`w-2 h-2 rounded-full transition-all duration-200 ${
                            index === currentImageIndex ? "bg-white" : "bg-white/50 hover:bg-white/75"
                          }`}
                        />
                      ))}
                    </div>
                  )}

                  <div className="absolute top-4 left-4">
                    <span className="bg-white/90 backdrop-blur-sm text-gray-800 px-3 py-1 rounded-full text-sm font-medium shadow-lg">
                      {publication.category.name}
                    </span>
                  </div>
                  <div className="absolute top-4 right-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium shadow-lg ${
                        publication.status === 1 ? "bg-green-500 text-white" : "bg-red-500 text-white"
                      }`}
                    >
                      {publication.status === 1 ? "Habilitado" : "Inhabilitado"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna derecha - Información */}
            <div className="flex flex-col space-y-6 justify-start">
              {/* Card de precio */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-gray-900 mb-2">
                    ${publication.price}
                  </div>
                  <div className="text-sm text-gray-500">Precio final</div>
                </div>

                {/* BOTONES: ahora con separación real */}
                <div className="flex flex-col gap-3">
                  <Link href={`/my-publications/${publication.id}/edit`}>
                    <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition">
                      <Edit className="w-4 h-4 mr-2 inline" />
                      Editar Publicación
                    </button>
                  </Link>

                  <button
                    onClick={handleDelete}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl transition"
                  >
                    <Trash2 className="w-4 h-4 mr-2 inline" />
                    Eliminar Publicación
                  </button>

                  <button
                    onClick={handleToggleStatus}
                    className={`w-full font-semibold py-3 px-6 rounded-xl transition ${
                      publication.status === 1
                        ? "bg-red-100 hover:bg-red-200 text-red-700"
                        : "bg-green-100 hover:bg-green-200 text-green-700"
                    }`}
                  >
                    {publication.status === 1 ? (
                      <>
                        <EyeOff className="w-4 h-4 mr-2 inline" />
                        Inhabilitar
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-2 inline" />
                        Habilitar
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Card de detalles */}
              <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col">
                <h3 className="font-bold text-gray-900 mb-4 text-lg">Detalles del Producto</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600 text-sm font-medium">Tipo:</span>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        publication.type === "servicio"
                          ? "border border-purple-200 text-purple-800 bg-purple-50"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {publication.type}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600 text-sm font-medium">Código:</span>
                    <span className="text-gray-900 font-mono text-sm">{publication.code}</span>
                  </div>
                  {publication.type === 'servicio' && (
                    publication.serviceHours && publication.serviceHours.length > 0 ? (
                      <div className="flex justify-between items-start py-2">
                        <span className="text-gray-600 text-sm font-medium">Horario:</span>
                        <div className="text-gray-900 text-sm text-right max-w-xs">
                          {(() => {
                            const dayNames = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
                            
                            // Agrupar por horario
                            const scheduleByTime: { [key: string]: number[] } = {};
                            publication.serviceHours.forEach(hour => {
                              const timeKey = `${hour.open_time.slice(0, 5)}-${hour.close_time.slice(0, 5)}`;
                              if (!scheduleByTime[timeKey]) {
                                scheduleByTime[timeKey] = [];
                              }
                              scheduleByTime[timeKey].push(hour.day_of_week);
                            });

                            // Formatear cada grupo de horario
                            const formatTimeGroup = (timeKey: string, days: number[]) => {
                              const sortedDays = days.sort((a, b) => a - b);
                              
                              // Agrupar días consecutivos
                              const ranges: string[] = [];
                              let start = sortedDays[0];
                              let end = start;
                              
                              for (let i = 1; i < sortedDays.length; i++) {
                                if (sortedDays[i] === end + 1) {
                                  end = sortedDays[i];
                                } else {
                                  // Finalizar rango actual
                                  if (start === end) {
                                    ranges.push(dayNames[start]);
                                  } else {
                                    ranges.push(`${dayNames[start]} - ${dayNames[end]}`);
                                  }
                                  start = sortedDays[i];
                                  end = start;
                                }
                              }
                              
                              // Agregar último rango
                              if (start === end) {
                                ranges.push(dayNames[start]);
                              } else {
                                ranges.push(`${dayNames[start]} - ${dayNames[end]}`);
                              }
                              
                              return `${ranges.join(', ')}/${timeKey}`;
                            };

                            return Object.keys(scheduleByTime)
                              .map(timeKey => formatTimeGroup(timeKey, scheduleByTime[timeKey]))
                              .join(', ');
                          })()}
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-start py-2">
                        <span className="text-gray-600 text-sm font-medium">Horario:</span>
                        <div className="text-gray-900 text-sm text-right max-w-xs">
                          No especificado
                        </div>
                      </div>
                    )
                  )}
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600 text-sm font-medium">Publicado:</span>
                    <span className="text-gray-900 text-sm">
                      {new Date(publication.published_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Sección de descripción - debajo de la imagen */}
          <div className="mt-8">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Descripción</h2>
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-700 leading-relaxed text-base break-words whitespace-pre-wrap">
                  {publication.description}
                </p>
              </div>
            </div>
          </div>

          {/* Mapa de ubicación */}
          {(publication.location_point || publication.location) && (
            <div className="mt-8">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Ubicación</h2>
                {publication.location_point ? (
                  <MiniMap
                    lat={publication.location_point.lat}
                    lng={publication.location_point.lng}
                    location={publication.location}
                    className="h-64 w-full"
                  />
                ) : (
                  <div className="h-64 w-full bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-4xl text-gray-400 mb-2">📍</div>
                      <p className="text-gray-600 font-medium">{publication.location}</p>
                      <p className="text-gray-400 text-sm">Ubicación sin coordenadas específicas</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de confirmación de eliminación */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
        publicationTitle={publication.title}
      />
    </AppLayout>
  );
}
