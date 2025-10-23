import AppLayout from "@/layouts/app-layout";
import { Head, Link, router } from "@inertiajs/react";
import { BreadcrumbItem } from "@/types";
import { 
    ArrowLeft, 
    Eye, 
    EyeOff, 
    X, 
    CheckCircle, 
    AlertTriangle,
    User,
    Calendar,
    FileText,
    MessageSquare,
    Shield
} from "lucide-react";
import { useState } from "react";
import GeneralModal from "@/components/ui/general-modal";

interface ModerationCase {
    id: number;
    status: string;
    source: string;
    report_count: number;
    resolution_notes: string | null;
    resolved_at: string | null;
    created_at: string;
    publication: {
        id: number;
        title: string;
        description: string;
        price: number;
        is_hidden: boolean;
        category: {
            name: string;
        };
        user: {
            name: string;
        };
        images: Array<{
            image_url: string;
        }>;
    };
    assigned_moderator: {
        name: string;
    } | null;
    reports: Array<{
        id: number;
        reason: string;
        description: string | null;
        created_at: string;
        reporter: {
            name: string;
        };
    }>;
    actions: Array<{
        id: number;
        action_type: string;
        action_description: string;
        created_at: string;
        moderator: {
            name: string;
        };
    }>;
    appeals: Array<{
        id: number;
        status: string;
        appeal_reason: string;
        review_notes: string | null;
        created_at: string;
        appealer: {
            name: string;
        };
        reviewing_moderator: {
            name: string;
        } | null;
    }>;
}

interface ModerationShowProps {
    case: ModerationCase;
}

export default function ModerationShow({ case: caseItem }: ModerationShowProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: "Moderación",
            href: "/moderation",
        },
        {
            title: `Caso #${caseItem.id}`,
            href: `/moderation/${caseItem.id}`,
        },
    ];

    const [showDismissModal, setShowDismissModal] = useState(false);
    const [showHideModal, setShowHideModal] = useState(false);
    const [notes, setNotes] = useState(caseItem.resolution_notes || '');
    const [hideReason, setHideReason] = useState('');

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'closed': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'pending': return 'Pendiente';
            case 'closed': return 'Cerrado';
            default: return status;
        }
    };


    const handleHidePublication = () => {
        if (!hideReason.trim()) {
            alert('Debes proporcionar un motivo para ocultar la publicación');
            return;
        }

        router.post(`/moderation/${caseItem.id}/hide-publication`, {
            reason: hideReason,
        }, {
            onSuccess: () => {
                setShowHideModal(false);
                setHideReason('');
            },
            onError: (errors) => {
                console.error('Error:', errors);
                alert('Error al ocultar la publicación');
            }
        });
    };

    const handleRestorePublication = () => {
        if (!confirm('¿Estás seguro de que quieres restaurar esta publicación?')) return;

        router.post(`/moderation/${caseItem.id}/restore-publication`, {}, {
            onError: (errors) => {
                console.error('Error:', errors);
                alert('Error al restaurar la publicación');
            }
        });
    };

    const handleDismissCase = () => {
        if (!notes.trim()) {
            alert('Debes proporcionar una razón para descartar el caso');
            return;
        }

        router.post(`/moderation/${caseItem.id}/dismiss`, {
            notes: notes,
        }, {
            onSuccess: () => {
                setShowDismissModal(false);
            },
            onError: (errors) => {
                console.error('Error:', errors);
                alert('Error al descartar el caso');
            }
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Caso #${caseItem.id} - Moderación`} />

            <div className="min-h-screen bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <Link
                                href="/moderation"
                                className="inline-flex items-center justify-center w-8 h-8 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Caso #{caseItem.id}</h1>
                                <p className="text-gray-600">{caseItem.publication.title}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(caseItem.status)}`}>
                                {getStatusText(caseItem.status)}
                            </span>
                            {caseItem.publication.is_hidden && (
                                <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                                    Oculto
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Columna principal */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Información de la publicación */}
                            <div className="bg-white rounded-2xl shadow-lg p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Información de la Publicación</h2>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Título</label>
                                        <p className="text-gray-900">{caseItem.publication.title}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Precio</label>
                                        <p className="text-gray-900">${caseItem.publication.price}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Categoría</label>
                                        <p className="text-gray-900">{caseItem.publication.category.name}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Vendedor</label>
                                        <p className="text-gray-900">{caseItem.publication.user.name}</p>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                                    <p className="text-gray-900">{caseItem.publication.description}</p>
                                </div>

                                {caseItem.publication.images.length > 0 && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Imágenes</label>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            {caseItem.publication.images.map((image, index) => (
                                                <img
                                                    key={index}
                                                    src={`/storage/${image.image_url}`}
                                                    alt={`Imagen ${index + 1}`}
                                                    className="w-full h-32 object-cover rounded-lg"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="mt-6 flex gap-3">
                                    <Link
                                        href={`/publication/${caseItem.publication.id}`}
                                        target="_blank"
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Ver Publicación
                                    </Link>
                                </div>
                            </div>

                            {/* Reportes */}
                            <div className="bg-white rounded-2xl shadow-lg p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Reportes ({caseItem.reports.length})</h2>
                                
                                <div className="space-y-4">
                                    {caseItem.reports.map((report) => (
                                        <div key={report.id} className="border border-gray-200 rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-4 h-4 text-gray-500" />
                                                    <span className="font-medium text-gray-900">{report.reporter.name}</span>
                                                </div>
                                                <span className="text-sm text-gray-500">
                                                    {new Date(report.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="mb-2">
                                                <span className="inline-block bg-red-100 text-red-800 text-sm px-2 py-1 rounded">
                                                    {report.reason}
                                                </span>
                                            </div>
                                            {report.description && (
                                                <p className="text-gray-700 text-sm">{report.description}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Historial de acciones */}
                            {caseItem.actions.length > 0 && (
                                <div className="bg-white rounded-2xl shadow-lg p-6">
                                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Historial de Acciones</h2>
                                    
                                    <div className="space-y-4">
                                        {caseItem.actions.map((action) => (
                                            <div key={action.id} className="flex items-start gap-3">
                                                <div className="p-2 bg-blue-100 rounded-full">
                                                    <Shield className="w-4 h-4 text-blue-600" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-medium text-gray-900">{action.moderator.name}</span>
                                                        <span className="text-sm text-gray-500">
                                                            {new Date(action.created_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <p className="text-gray-700">{action.action_description}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Apelaciones */}
                            {caseItem.appeals.length > 0 && (
                                <div className="bg-white rounded-2xl shadow-lg p-6">
                                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Apelaciones ({caseItem.appeals.length})</h2>
                                    
                                    <div className="space-y-4">
                                        {caseItem.appeals.map((appeal) => (
                                            <div key={appeal.id} className="border border-gray-200 rounded-lg p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <MessageSquare className="w-4 h-4 text-gray-500" />
                                                    <span className="font-medium text-gray-900">{appeal.appealer.name}</span>
                                                </div>
                                                <p className="text-gray-700 text-sm mb-2">{appeal.appeal_reason}</p>
                                                {appeal.review_notes && (
                                                    <div className="bg-gray-50 rounded p-3">
                                                        <p className="text-sm text-gray-600">
                                                            <strong>Revisión:</strong> {appeal.review_notes}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Acciones */}
                            <div className="bg-white rounded-2xl shadow-lg p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones</h3>
                                
                                <div className="space-y-3">
                                    {!caseItem.publication.is_hidden ? (
                                        <button
                                            onClick={() => setShowHideModal(true)}
                                            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl transition"
                                        >
                                            <EyeOff className="w-4 h-4 mr-2 inline" />
                                            Ocultar Publicación
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleRestorePublication}
                                            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-xl transition"
                                        >
                                            <Eye className="w-4 h-4 mr-2 inline" />
                                            Restaurar Publicación
                                        </button>
                                    )}

                                    <button
                                        onClick={() => setShowDismissModal(true)}
                                        className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-xl transition"
                                    >
                                        <X className="w-4 h-4 mr-2 inline" />
                                        Descartar Caso
                                    </button>
                                </div>
                            </div>

                            {/* Información del caso */}
                            <div className="bg-white rounded-2xl shadow-lg p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Información del Caso</h3>
                                
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">ID del Caso</label>
                                        <p className="text-gray-900">#{caseItem.id}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Estado</label>
                                        <span className={`px-2 py-1 rounded text-sm font-medium ${getStatusColor(caseItem.status)}`}>
                                            {getStatusText(caseItem.status)}
                                        </span>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Fuente</label>
                                        <p className="text-gray-900 capitalize">{caseItem.source}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Reportes</label>
                                        <p className="text-gray-900">{caseItem.report_count}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Creado</label>
                                        <p className="text-gray-900">{new Date(caseItem.created_at).toLocaleDateString()}</p>
                                    </div>
                                    {caseItem.assigned_moderator && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Asignado a</label>
                                            <p className="text-gray-900">{caseItem.assigned_moderator.name}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            {/* Modal para descartar caso */}
            {showDismissModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Descartar Caso</h3>
                        
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Razón para descartar</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Explica por qué se descarta este caso..."
                                required
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleDismissCase}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                            >
                                Descartar
                            </button>
                            <button
                                onClick={() => setShowDismissModal(false)}
                                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-semibold py-2 px-4 rounded-lg transition"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal para ocultar publicación */}
            <GeneralModal
                isOpen={showHideModal}
                onClose={() => setShowHideModal(false)}
                title="Ocultar Publicación"
            >
                <div className="space-y-4">
                    <p className="text-gray-600">
                        ¿Estás seguro de que quieres ocultar esta publicación? 
                        Proporciona un motivo detallado para esta acción.
                    </p>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Motivo de ocultación
                        </label>
                        <textarea
                            value={hideReason}
                            onChange={(e) => setHideReason(e.target.value)}
                            rows={4}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                            placeholder="Explica detalladamente por qué se oculta esta publicación..."
                            required
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={handleHidePublication}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                        >
                            Ocultar Publicación
                        </button>
                        <button
                            onClick={() => setShowHideModal(false)}
                            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-semibold py-2 px-4 rounded-lg transition"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </GeneralModal>
        </AppLayout>
    );
}
