import { useState, useRef } from "react";
import { useForm } from "@inertiajs/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, X, AlertCircle, ArrowLeft } from "lucide-react";
import { Category } from "@/types";
import AppLayout from "@/layouts/app-layout";
import { Head, Link, router } from "@inertiajs/react";
import { BreadcrumbItem } from "@/types";
import MapPicker from "@/components/publications/MapPicker";
import ServiceSchedule from "@/components/publications/ServiceSchedule";
import { useToast, ToastProvider } from "@/hooks/useToast";

interface CreatePublicationProps {
    categories: Category[];
}

// Componente interno que usa useToast
function CreatePublicationContent({ categories }: CreatePublicationProps) {
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { showToast } = useToast();

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Mis Publicaciones',
            href: '/my-publications',
        },
        {
            title: 'Crear Publicación',
            href: '/my-publications/create',
        },
    ];

    const { data, setData, post, processing, errors } = useForm({
        title: '',
        description: '',
        price: '',
        category_id: '',
        type: '',
        lat: '',
        lng: '',
        horario: '',
        images: [] as File[]
    });

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        
        // Validar número máximo de imágenes
        if (selectedImages.length + files.length > 5) {
            showToast({
                type: 'error',
                title: 'Demasiadas imágenes',
                message: 'No se pueden subir más de 5 imágenes.'
            });
            return;
        }

        // Validar tamaño de cada archivo (5MB máximo) y archivos corruptos
        const oversizedFiles = files.filter(file => file.size > 5 * 1024 * 1024);
        if (oversizedFiles.length > 0) {
            showToast({
                type: 'error',
                title: 'Archivo demasiado grande',
                message: 'Las imágenes no pueden superar los 5MB cada una.'
            });
            return;
        }

        // Validar archivos vacíos (ser más permisivo con tipos)
        const emptyFiles = files.filter(file => file.size === 0);
        if (emptyFiles.length > 0) {
            showToast({
                type: 'error',
                title: 'Archivo vacío',
                message: 'Algunos archivos están vacíos.'
            });
            return;
        }

        const newImages = [...selectedImages, ...files];
        setSelectedImages(newImages);
        setData('images', newImages);

        // Create previews
        const newPreviews = files.map(file => URL.createObjectURL(file));
        setImagePreviews([...imagePreviews, ...newPreviews]);
    };

    const removeImage = (index: number) => {
        const newImages = selectedImages.filter((_, i) => i !== index);
        const newPreviews = imagePreviews.filter((_, i) => i !== index);
        
        setSelectedImages(newImages);
        setImagePreviews(newPreviews);
        setData('images', newImages);
    };

    const handleLocationChange = (lat: number, lng: number) => {
        setData('lat', lat.toString());
        setData('lng', lng.toString());
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validar que se haya seleccionado una ubicación en el mapa
        if (!data.lat || !data.lng || data.lat === '' || data.lng === '') {
            showToast({
                type: 'error',
                title: 'Ubicación requerida',
                message: 'Por favor selecciona una ubicación en el mapa.'
            });
            return;
        }
        
        // Crear FormData manualmente para asegurar que los archivos se envíen
        const formData = new FormData();
        formData.append('title', data.title);
        formData.append('description', data.description);
        formData.append('price', data.price);
        formData.append('category_id', data.category_id);
        formData.append('type', data.type);
        formData.append('lat', data.lat);
        formData.append('lng', data.lng);
        formData.append('horario', data.horario || '');
        
        // Agregar imágenes como images[]
        selectedImages.forEach((image) => {
            formData.append('images[]', image);
        });
        
        // Enviar FormData directamente
        router.post('/my-publications', formData, {
            forceFormData: true,
            onSuccess: () => {
                showToast({
                    type: 'success',
                    title: 'Publicación creada',
                    message: 'Tu publicación ha sido creada exitosamente.'
                });
                // Redirigir a Mis Publicaciones
                router.visit('/my-publications');
            },
            onError: (errors) => {
                // Mostrar errores específicos con toast
                Object.keys(errors).forEach(key => {
                    const errorValue = errors[key];
                    const errorMessage = Array.isArray(errorValue) ? errorValue[0] : errorValue;
                    showToast({
                        type: 'error',
                        title: 'Error de validación',
                        message: errorMessage
                    });
                });
            }
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Crear Publicación" />
            
            <div className="bg-gray-50 min-h-screen py-8">
                <div className="max-w-4xl mx-auto px-6">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-8">
                        <Link 
                            href="/my-publications"
                            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Volver a Mis Publicaciones
                        </Link>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm p-8">
                        <h1 className="text-2xl font-bold text-gray-900 mb-6">Crear Nueva Publicación</h1>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Información Básica */}
                            <Card>
                                <CardContent className="pt-6">
                                    <h3 className="text-lg font-semibold mb-4">Información Básica</h3>
                                    <div className="space-y-4">
                                        {/* Título */}
                                        <div>
                                            <Label htmlFor="title">Título *</Label>
                                            <Input
                                                id="title"
                                                type="text"
                                                placeholder="Ej: Laptop Dell XPS 15 2024"
                                                value={data.title}
                                                onChange={(e) => setData('title', e.target.value)}
                                                className={errors.title ? 'border-red-500' : ''}
                                            />
                                            {errors.title && (
                                                <div className="flex items-center gap-1 mt-1 text-red-500 text-sm">
                                                    <AlertCircle className="w-4 h-4" />
                                                    {errors.title}
                                                </div>
                                            )}
                                        </div>

                                        {/* Descripción */}
                                        <div>
                                            <Label htmlFor="description">Descripción *</Label>
                                            <Textarea
                                                id="description"
                                                placeholder="Describe tu producto o servicio en detalle..."
                                                value={data.description}
                                                onChange={(e) => setData('description', e.target.value)}
                                                rows={4}
                                                className={errors.description ? 'border-red-500' : ''}
                                            />
                                            {errors.description && (
                                                <div className="flex items-center gap-1 mt-1 text-red-500 text-sm">
                                                    <AlertCircle className="w-4 h-4" />
                                                    {errors.description}
                                                </div>
                                            )}
                                        </div>

                                        {/* Categoría */}
                                        <div>
                                            <Label htmlFor="category_id">Categoría *</Label>
                                            <Select value={data.category_id} onValueChange={(value) => setData('category_id', value)}>
                                                <SelectTrigger className={errors.category_id ? 'border-red-500' : ''}>
                                                    <SelectValue placeholder="Selecciona una categoría" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {categories.map((category) => (
                                                        <SelectItem key={category.id} value={category.id.toString()}>
                                                            {category.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {errors.category_id && (
                                                <div className="flex items-center gap-1 mt-1 text-red-500 text-sm">
                                                    <AlertCircle className="w-4 h-4" />
                                                    {errors.category_id}
                                                </div>
                                            )}
                                        </div>

                                        {/* Tipo */}
                                        <div>
                                            <Label htmlFor="type">Tipo *</Label>
                                            <Select value={data.type} onValueChange={(value: "servicio" | "producto") => setData('type', value)}>
                                                <SelectTrigger className={errors.type ? 'border-red-500' : ''}>
                                                    <SelectValue placeholder="Selecciona el tipo" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="producto">Producto</SelectItem>
                                                    <SelectItem value="servicio">Servicio</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {errors.type && (
                                                <div className="flex items-center gap-1 mt-1 text-red-500 text-sm">
                                                    <AlertCircle className="w-4 h-4" />
                                                    {errors.type}
                                                </div>
                                            )}
                                        </div>

                                        {/* Horario de atención (solo para servicios) */}
                                        {data.type === 'servicio' && (
                                            <div>
                                                <ServiceSchedule
                                                    value={data.horario}
                                                    onChange={(value: string) => setData('horario', value)}
                                                    error={errors.horario}
                                                    required={true}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Precio */}
                            <Card>
                                <CardContent className="pt-6">
                                    <h3 className="text-lg font-semibold mb-4">Precio</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <Label htmlFor="price">Precio *</Label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                                                <Input
                                                    id="price"
                                                    type="number"
                                                    placeholder="0.00"
                                                    value={data.price}
                                                    onChange={(e) => setData('price', e.target.value)}
                                                    className={`pl-8 ${errors.price ? 'border-red-500' : ''}`}
                                                    step="0.01"
                                                    min="0"
                                                />
                                            </div>
                                            {errors.price && (
                                                <div className="flex items-center gap-1 mt-1 text-red-500 text-sm">
                                                    <AlertCircle className="w-4 h-4" />
                                                    {errors.price}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Mapa de Ubicación */}
                            <Card>
                                <CardContent className="pt-6">
                                    <h3 className="text-lg font-semibold mb-4">Ubicación en el mapa *</h3>
                                    <p className="text-sm text-gray-600 mb-4">
                                        Selecciona la ubicación exacta de tu producto o servicio en el mapa
                                    </p>
                                    <MapPicker
                                        lat={data.lat ? parseFloat(data.lat) : -0.2299}
                                        lng={data.lng ? parseFloat(data.lng) : -78.5249}
                                        onLocationChange={handleLocationChange}
                                        className="h-64 w-full"
                                    />
                                    {(!data.lat || !data.lng || data.lat === '' || data.lng === '') && (
                                        <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
                                            <AlertCircle className="w-4 h-4" />
                                            Por favor selecciona una ubicación en el mapa
                                        </p>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Imágenes */}
                            <Card>
                                <CardContent className="pt-6">
                                    <h3 className="text-lg font-semibold mb-4">Imágenes</h3>
                                    <p className="text-sm text-gray-600 mb-4">
                                        Agrega hasta 5 imágenes de tu producto (máximo 5MB cada una)
                                    </p>

                                    {/* Upload Area */}
                                    <div
                                        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                        <p className="text-gray-600 mb-2">Subir imágenes</p>
                                        <p className="text-sm text-gray-500">
                                            Arrastra y suelta o haz clic para seleccionar
                                        </p>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            onChange={handleImageSelect}
                                            className="hidden"
                                        />
                                    </div>

                                    {/* Image Previews */}
                                    {imagePreviews.length > 0 && (
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                                            {imagePreviews.map((preview, index) => (
                                                <div key={index} className="relative">
                                                    <img
                                                        src={preview}
                                                        alt={`Preview ${index + 1}`}
                                                        className="w-full h-32 object-cover rounded-lg"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="sm"
                                                        className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full"
                                                        onClick={() => removeImage(index)}
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {errors.images && (
                                        <div className="flex items-center gap-1 mt-2 text-red-500 text-sm">
                                            <AlertCircle className="w-4 h-4" />
                                            {errors.images}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Botones */}
                            <div className="flex justify-end gap-4 pt-4">
                                <Link href="/my-publications">
                                    <Button type="button" variant="outline" disabled={processing}>
                                        Cancelar
                                    </Button>
                                </Link>
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    {processing ? 'Creando...' : 'Crear Publicación'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

// Componente principal que envuelve con ToastProvider
export default function CreatePublication({ categories }: CreatePublicationProps) {
    return (
        <ToastProvider>
            <CreatePublicationContent categories={categories} />
        </ToastProvider>
    );
}
