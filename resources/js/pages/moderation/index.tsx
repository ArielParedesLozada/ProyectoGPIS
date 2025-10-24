import AppLayout from "@/layouts/app-layout";
import { Head, Link, router } from "@inertiajs/react";
import { BreadcrumbItem } from "@/types";
import { 
    Filter, 
    Search, 
    Eye, 
    User, 
    Calendar, 
    AlertTriangle,
    CheckCircle,
    Clock,
    Users,
    FileText
} from "lucide-react";
import { useState } from "react";

interface ModerationCase {
    id: number;
    status: string;
    source: string;
    report_count: number;
    created_at: string;
    publication: {
        id: number;
        title: string;
        category: {
            name: string;
        };
    };
    assigned_moderator: {
        name: string;
    } | null;
    reports: Array<{
        reason: string;
        created_at: string;
    }>;
}

interface ModerationIndexProps {
    cases: {
        data: ModerationCase[];
        links: any[];
        meta: any;
    };
    stats: {
        total_cases: number;
        pending_cases: number;
        in_review_cases: number;
        my_cases: number;
        unassigned_cases: number;
    };
    filters: {
        status?: string;
        source?: string;
        assigned_to_me?: boolean;
        unassigned?: boolean;
        category_id?: number;
        date_from?: string;
        date_to?: string;
    };
}

export default function ModerationIndex({ cases, stats, filters }: ModerationIndexProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: "Moderación",
            href: "/moderation",
        },
    ];

    const [showFilters, setShowFilters] = useState(false);
    const [localFilters, setLocalFilters] = useState(filters);

    const handleFilterChange = (key: string, value: any) => {
        const newFilters = { ...localFilters, [key]: value };
        setLocalFilters(newFilters);
        
        // Aplicar filtros inmediatamente
        router.get('/moderation', newFilters, {
            preserveState: true,
            replace: true,
        });
    };

    const clearFilters = () => {
        setLocalFilters({});
        router.get('/moderation', {}, {
            preserveState: true,
            replace: true,
        });
    };

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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Moderación - Bandeja de Casos" />

            <div className="min-h-screen bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Moderación</h1>
                        <p className="text-gray-600">Gestiona los reportes y casos de moderación</p>
                    </div>

                    {/* Estadísticas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            <div className="flex items-center">
                                <div className="p-3 bg-blue-100 rounded-full">
                                    <FileText className="w-6 h-6 text-blue-600" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Total Casos</p>
                                    <p className="text-2xl font-bold text-gray-900">{stats.total_cases}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            <div className="flex items-center">
                                <div className="p-3 bg-yellow-100 rounded-full">
                                    <Clock className="w-6 h-6 text-yellow-600" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Pendientes</p>
                                    <p className="text-2xl font-bold text-gray-900">{stats.pending_cases}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            <div className="flex items-center">
                                <div className="p-3 bg-purple-100 rounded-full">
                                    <Eye className="w-6 h-6 text-purple-600" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">En Revisión</p>
                                    <p className="text-2xl font-bold text-gray-900">{stats.in_review_cases}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            <div className="flex items-center">
                                <div className="p-3 bg-green-100 rounded-full">
                                    <User className="w-6 h-6 text-green-600" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Mis Casos</p>
                                    <p className="text-2xl font-bold text-gray-900">{stats.my_cases}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            <div className="flex items-center">
                                <div className="p-3 bg-red-100 rounded-full">
                                    <Users className="w-6 h-6 text-red-600" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Sin Asignar</p>
                                    <p className="text-2xl font-bold text-gray-900">{stats.unassigned_cases}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filtros */}
                    <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">Filtros</h2>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                            >
                                <Filter className="w-4 h-4" />
                                {showFilters ? 'Ocultar' : 'Mostrar'} Filtros
                            </button>
                        </div>

                        {showFilters && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                                    <select
                                        value={localFilters.status || ''}
                                        onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Todos los estados</option>
                                        <option value="pending">Pendiente</option>
                                        <option value="closed">Cerrado</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Fuente</label>
                                    <select
                                        value={localFilters.source || ''}
                                        onChange={(e) => handleFilterChange('source', e.target.value || undefined)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Todas las fuentes</option>
                                        <option value="user">Usuario</option>
                                        <option value="system">Sistema</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Fecha desde</label>
                                    <input
                                        type="date"
                                        value={localFilters.date_from || ''}
                                        onChange={(e) => handleFilterChange('date_from', e.target.value || undefined)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Fecha hasta</label>
                                    <input
                                        type="date"
                                        value={localFilters.date_to || ''}
                                        onChange={(e) => handleFilterChange('date_to', e.target.value || undefined)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex gap-4 mt-4">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={localFilters.assigned_to_me || false}
                                    onChange={(e) => handleFilterChange('assigned_to_me', e.target.checked || undefined)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="ml-2 text-sm text-gray-700">Solo asignados a mí</span>
                            </label>

                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={localFilters.unassigned || false}
                                    onChange={(e) => handleFilterChange('unassigned', e.target.checked || undefined)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="ml-2 text-sm text-gray-700">Sin asignar</span>
                            </label>

                            <button
                                onClick={clearFilters}
                                className="text-sm text-gray-500 hover:text-gray-700"
                            >
                                Limpiar filtros
                            </button>
                        </div>
                    </div>

                    {/* Lista de casos */}
                    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900">Casos de Moderación</h2>
                        </div>

                        <div className="divide-y divide-gray-200">
                            {cases.data.map((caseItem) => (
                                <div key={caseItem.id} className="p-6 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <Link
                                                    href={`/moderation/${caseItem.id}`}
                                                    className="text-lg font-semibold text-gray-900 hover:text-blue-600"
                                                >
                                                    {caseItem.publication.title}
                                                </Link>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(caseItem.status)}`}>
                                                    {getStatusText(caseItem.status)}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-4 text-sm text-gray-600">
                                                <span className="flex items-center gap-1">
                                                    <FileText className="w-4 h-4" />
                                                    {caseItem.publication.category.name}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <AlertTriangle className="w-4 h-4" />
                                                    {caseItem.report_count} reporte{caseItem.report_count !== 1 ? 's' : ''}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" />
                                                    {new Date(caseItem.created_at).toLocaleDateString()}
                                                </span>
                                                {caseItem.assigned_moderator && (
                                                    <span className="flex items-center gap-1">
                                                        <User className="w-4 h-4" />
                                                        {caseItem.assigned_moderator.name}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="mt-2">
                                                <p className="text-sm text-gray-600">
                                                    Último reporte: {caseItem.reports[0]?.reason}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Link
                                                href={`/moderation/${caseItem.id}`}
                                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                            >
                                                Ver Detalles
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {cases.data.length === 0 && (
                            <div className="p-12 text-center">
                                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay casos</h3>
                                <p className="text-gray-600">No se encontraron casos que coincidan con los filtros aplicados.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
