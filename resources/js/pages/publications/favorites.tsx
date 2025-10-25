import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AppLayout from "@/layouts/app-layout";
import { SharedData, Paginated, Publication, Category, BreadcrumbItem } from "@/types";
import { usePage, Head, Link } from "@inertiajs/react";
import { 
    Heart, 
    DollarSign
} from "lucide-react";
import PublicationCard from "@/components/publications/publication-card";


function FavoritesContent() {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Favoritos',
            href: '/favorites',
        },
    ];

    const { auth, favorites, categories } = usePage<SharedData & {
        favorites: Paginated<Publication>,
        categories: Category[],
    }>().props;

    return (
        <>
            <Head title="Favoritos" />
            
            <div className="bg-gray-50 min-h-screen space-y-8 px-6 py-6">
                {/* Header */}
                <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-xl p-6 text-white mb-8">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">Mis Favoritos</h1>
                            <p className="text-red-100 text-lg">Publicaciones que te han gustado</p>
                        </div>
                        <div className="flex space-x-3">
                            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                                <Heart className="w-4 h-4 mr-1" />
                                {favorites.data.length} favoritos
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                        <Card className="border-l-4 border-l-red-500 hover:shadow-lg transition-all duration-200 bg-white/95 backdrop-blur-sm border border-gray-200/50">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center">
                                    <Heart className="h-5 w-5 mr-2 text-red-600" />
                                    Total Favoritos
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-red-600 mb-2">{favorites.data.length}</div>
                                <p className="text-sm text-gray-600">Publicaciones guardadas</p>
                            </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-all duration-200 bg-white/95 backdrop-blur-sm border border-gray-200/50">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center">
                                    <DollarSign className="h-5 w-5 mr-2 text-blue-600" />
                                    Productos
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-blue-600 mb-2">
                                    {favorites.data.filter(p => p.type === 'producto').length}
                                </div>
                                <p className="text-sm text-gray-600">Productos favoritos</p>
                            </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-all duration-200 bg-white/95 backdrop-blur-sm border border-gray-200/50">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center">
                                    <Heart className="h-5 w-5 mr-2 text-purple-600" />
                                    Servicios
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-purple-600 mb-2">
                                    {favorites.data.filter(p => p.type === 'servicio').length}
                                </div>
                                <p className="text-sm text-gray-600">Servicios favoritos</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Favorites Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {favorites.data.map((publication) => (
                            <PublicationCard key={publication.id} publication={publication} />
                        ))}
                    </div>

                    {/* Paginación - Solo visible cuando hay favoritos */}
                    {favorites.data && favorites.data.length > 0 && favorites.links && favorites.links.length > 0 && (
                        <div className="flex justify-center mt-8">
                            <div className="flex items-center gap-2">
                                {favorites.links.map((link, i) =>
                                    link.url ? (
                                        <Link
                                            key={i}
                                            href={link.url}
                                            className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
                                                link.active 
                                                    ? "bg-red-600 text-white border-red-600" 
                                                    : "text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                                            }`}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ) : (
                                        <span
                                            key={i}
                                            className="px-4 py-2 text-gray-400 cursor-not-allowed text-sm"
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    )
                                )}
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {favorites.data.length === 0 && (
                        <div className="text-center py-12">
                            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <Heart className="w-12 h-12 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                No tienes favoritos
                            </h3>
                            <p className="text-gray-500 mb-6">
                                Comienza agregando publicaciones a tus favoritos
                            </p>
                            <Link href="/publications">
                                <Button className="bg-red-600 hover:bg-red-700 text-white">
                                    <Heart className="w-4 h-4 mr-2" />
                                    Explorar Publicaciones
                                </Button>
                            </Link>
                        </div>
                    )}

                </div>
            </div>

        </>
    );
}

// Layout estático de Inertia
Favorites.layout = (page: React.ReactNode) => (
    <AppLayout breadcrumbs={[
        {
            title: 'Favoritos',
            href: '/favorites',
        },
    ]}>
        {page}
    </AppLayout>
);

export default function Favorites() {
    return <FavoritesContent />;
}
