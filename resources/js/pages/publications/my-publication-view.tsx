import AppLayout from "@/layouts/app-layout";
import { BreadcrumbItem, Publication } from "@/types";
import { Head, Link, router } from "@inertiajs/react";
import { ArrowLeft, Edit, Eye, EyeOff, Trash2, ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
import { useState, useEffect } from "react";
import MiniMap from "@/components/publications/MiniMap";
import DeleteConfirmationModal from "@/components/publications/delete-confirmation-modal";
import ImageGallery from "@/components/publications/ImageGallery";
import HeightSync from "@/components/layout/HeightSync";

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

  // Estado para el modal de apelación
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [appealReason, setAppealReason] = useState('');

  // Estado para el modal de confirmación de eliminación
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Array de imágenes - solo las imágenes reales de la publicación
  const images =
    publication.images && publication.images.length > 0
      ? publication.images.map((img) => `/storage/${img.image_url}`)
      : [];

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

  const handleAppeal = async () => {
    if (!appealReason.trim()) {
      alert('Debes proporcionar una razón para la apelación');
      return;
    }

    try {
      const response = await fetch(`/my-publications/${publication.id}/appeal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: JSON.stringify({
          reason: appealReason,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(data.message);
        setShowAppealModal(false);
        setAppealReason('');
        router.reload();
      } else {
        alert(data.message || 'Error al enviar la apelación');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al enviar la apelación');
    }
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={`${publication.title} - Mis Publicaciones`} />

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
          {/* Flecha de regreso - fuera del grid */}
          <div className="mb-2">
            <Link
              href="/my-publications"
              className="inline-flex items-center justify-center w-7 h-7 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Columna izquierda - Imagen */}
            <div className="lg:col-span-2">
              <HeightSync syncWith="#right-detail-panel" enableFrom="lg" minHeight={360} maxHeight={900}>
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden h-full">
                  <div className="relative h-full">
                    <ImageGallery 
                      images={images}
                      title={publication.title}
                      className="w-full h-full"
                    />
                    
                    {/* badges existentes */}
                    <div className="absolute top-4 left-4 z-10">
                      <span className="bg-white/90 backdrop-blur-sm text-gray-800 px-3 py-1 rounded-full text-sm font-medium shadow-lg">
                        {publication.category.name}
                      </span>
                    </div>
                    <div className="absolute top-4 right-4 z-10">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium shadow-lg ${publication.status === 1 ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
                        {publication.status === 1 ? "Habilitado" : "Inhabilitado"}
                      </span>
                    </div>
                  </div>
                </div>
              </HeightSync>
            </div>

            {/* Columna derecha - Información */}
            <div id="right-detail-panel" className="flex flex-col space-y-6 justify-start">
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
                  {/* Botón Editar */}
                  <Link href={publication.has_final_moderation_decision ? '#' : `/my-publications/${publication.id}/edit`}>
                    <button 
                      disabled={publication.has_final_moderation_decision}
                      className={`w-full font-semibold py-3 px-6 rounded-xl transition ${
                        publication.has_final_moderation_decision
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                      title={publication.has_final_moderation_decision ? 'No puedes editar esta publicación porque ya tiene una decisión final de moderación' : ''}
                    >
                      <Edit className="w-4 h-4 mr-2 inline" />
                      Editar Publicación
                    </button>
                  </Link>

                  {/* Botón Eliminar - Siempre disponible */}
                  <button
                    onClick={handleDelete}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl transition"
                  >
                    <Trash2 className="w-4 h-4 mr-2 inline" />
                    Eliminar Publicación
                  </button>

                  {/* Botón Inhabilitar/Habilitar */}
                  <button
                    onClick={publication.has_final_moderation_decision ? undefined : handleToggleStatus}
                    disabled={publication.has_final_moderation_decision}
                    className={`w-full font-semibold py-3 px-6 rounded-xl transition ${
                      publication.has_final_moderation_decision
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : publication.status === 1
                        ? "bg-red-100 hover:bg-red-200 text-red-700"
                        : "bg-green-100 hover:bg-green-200 text-green-700"
                    }`}
                    title={publication.has_final_moderation_decision ? 'No puedes cambiar el estado de esta publicación porque ya tiene una decisión final de moderación' : ''}
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

              {/* Botón de apelación si la publicación está oculta Y NO tiene decisión final */}
              {publication.is_hidden && !publication.has_final_moderation_decision && (
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <button
                    onClick={() => setShowAppealModal(true)}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-6 rounded-xl transition"
                  >
                    <MessageSquare className="w-4 h-4 mr-2 inline" />
                    Apelar Moderación
                  </button>
                </div>
              )}
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
      {/* Modal de apelación */}
      {showAppealModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Apelar Moderación</h3>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Razón de la apelación
              </label>
              <textarea
                value={appealReason}
                onChange={(e) => setAppealReason(e.target.value)}
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Explica por qué crees que la moderación fue incorrecta..."
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAppeal}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                Enviar Apelación
              </button>
              <button
                onClick={() => {
                  setShowAppealModal(false);
                  setAppealReason('');
                }}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-semibold py-2 px-4 rounded-lg transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

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
