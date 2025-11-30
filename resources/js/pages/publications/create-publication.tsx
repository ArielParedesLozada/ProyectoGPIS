import { useState, useRef, useEffect } from "react";
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
import { useToast } from "@/hooks/useToast";
import ErrorMessage from "@/components/ui/error-message";
import { useFieldValidation } from "@/hooks/use-field-validation";
import CustomError from "@/components/custom-error";

interface CreatePublicationProps {
    categories: Category[];
}

export default function CreatePublication({ categories }: CreatePublicationProps) {
    const { markFieldAsTouched, markSelectAsTouched, shouldShowError, getErrorMessage } = useFieldValidation();
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
        schedule: [] as { day: number; open: string; close: string }[],
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

        // Validar tipos de archivo permitidos
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        const invalidFiles = files.filter(file => !allowedTypes.includes(file.type));
        if (invalidFiles.length > 0) {
            showToast({
                type: 'error',
                title: 'Tipo de archivo no permitido',
                message: 'Solo se permiten archivos de imagen (JPG, PNG, GIF, WEBP).'
            });
            return;
        }

        // Validar tamaño de cada archivo (5MB máximo)
        const oversizedFiles = files.filter(file => file.size > 5 * 1024 * 1024);
        if (oversizedFiles.length > 0) {
            showToast({
                type: 'error',
                title: 'Archivo demasiado grande',
                message: 'Las imágenes no pueden superar los 5MB cada una.'
            });
            return;
        }

        // Validar archivos vacíos
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
        // Redondear coordenadas a 6 decimales para mayor precisión
        const roundedLat = Math.round(lat * 1000000) / 1000000;
        const roundedLng = Math.round(lng * 1000000) / 1000000;
        
        console.log('Location changed:', {
            original: { lat, lng },
            rounded: { lat: roundedLat, lng: roundedLng }
        });
        
        setData('lat', roundedLat.toString());
        setData('lng', roundedLng.toString());
    };

    // Función para verificar si todos los campos obligatorios están completos
    const isFormValid = () => {
        // Verificar campos básicos
        const basicFieldsValid = data.title.trim() !== '' && 
                                data.description.trim() !== '' && 
                                data.price.trim() !== '' && 
                                data.category_id !== '' && 
                                data.type !== '';
        
        // Verificar ubicación
        const locationValid = data.lat !== '' && data.lng !== '';
        
        // Verificar imágenes
        const imagesValid = selectedImages.length > 0;
        
        // Verificar horario si es servicio
        const scheduleValid = data.type !== 'servicio' || data.schedule.length > 0;
        
        return basicFieldsValid && locationValid && imagesValid && scheduleValid;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Crear FormData manualmente para asegurar que los archivos se envíen
        const formData = new FormData();
        formData.append('title', data.title);
        formData.append('description', data.description);
        formData.append('price', data.price);
        formData.append('category_id', data.category_id);
        formData.append('type', data.type);
        formData.append('lat', data.lat);
        formData.append('lng', data.lng);
        formData.append('schedule', JSON.stringify(data.schedule));
        
        // Agregar imágenes como images[]
        selectedImages.forEach((image) => {
            formData.append('images[]', image);
        });
        
        // Enviar FormData directamente
        router.post('/my-publications', formData, {
            forceFormData: true,
            // Los errores de validación del servidor se manejan automáticamente por FlashToastHandler
        });
    };

    return (
        <>
            <Head title="Crear Publicación" />
            
            <div className="bg-gray-50 min-h-screen py-8">
                <div className="max-w-4xl mx-auto px-6">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-8">
                        <Link 
                            href="/my-publications"
                            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Volver a Mis Publicaciones
                        </Link>
                    </div>

                    <div className="bg-card rounded-lg shadow-sm p-8">
                        <h1 className="text-2xl font-bold text-foreground mb-6">Crear Nueva Publicación</h1>

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
                                                onBlur={(e) => markFieldAsTouched('title', e.target.value)}
                                                className={shouldShowError('title', errors.title, data.title) ? 'border-red-500' : ''}
                                            />
                                            <CustomError 
                                                message={getErrorMessage('title', errors.title, data.title)} 
                                                show={shouldShowError('title', errors.title, data.title)}
                                            />
                                        </div>

                                        {/* Descripción */}
                                        <div>
                                            <Label htmlFor="description">Descripción *</Label>
                                            <Textarea
                                                id="description"
                                                placeholder="Describe tu producto o servicio en detalle..."
                                                value={data.description}
                                                onChange={(e) => setData('description', e.target.value)}
                                                onBlur={(e) => markFieldAsTouched('description', e.target.value)}
                                                rows={4}
                                                className={shouldShowError('description', errors.description, data.description) ? 'border-red-500' : ''}
                                            />
                                            <CustomError 
                                                message={getErrorMessage('description', errors.description, data.description)} 
                                                show={shouldShowError('description', errors.description, data.description)}
                                            />
                                        </div>

                                        {/* Categoría */}
                                        <div>
                                            <Label htmlFor="category_id">Categoría *</Label>
                                            <Select value={data.category_id} onValueChange={(value) => {
                                                setData('category_id', value);
                                            }}>
                                                <SelectTrigger 
                                                    className={shouldShowError('category_id', errors.category_id, data.category_id) ? 'border-red-500' : ''}
                                                    onBlur={() => markSelectAsTouched('category_id', data.category_id)}
                                                >
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
                                            <CustomError 
                                                message={getErrorMessage('category_id', errors.category_id, data.category_id)} 
                                                show={shouldShowError('category_id', errors.category_id, data.category_id)}
                                            />
                                        </div>

                                        {/* Tipo */}
                                        <div>
                                            <Label htmlFor="type">Tipo *</Label>
                                            <Select value={data.type} onValueChange={(value: "servicio" | "producto") => {
                                                setData('type', value);
                                            }}>
                                                <SelectTrigger 
                                                    className={shouldShowError('type', errors.type, data.type) ? 'border-red-500' : ''}
                                                    onBlur={() => markSelectAsTouched('type', data.type)}
                                                >
                                                    <SelectValue placeholder="Selecciona el tipo" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="producto">Producto</SelectItem>
                                                    <SelectItem value="servicio">Servicio</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <CustomError 
                                                message={getErrorMessage('type', errors.type, data.type)} 
                                                show={shouldShowError('type', errors.type, data.type)}
                                            />
                                        </div>

                                        {/* Horario de atención (solo para servicios) */}
                                        {data.type === 'servicio' && (
                                            <div>
                                                <ServiceSchedule
                                                    value={data.schedule}
                                                    onChange={(value: { day: number; open: string; close: string }[]) => {
                                                        setData('schedule', value.map(i => ({ ...i })));
                                                    }}
                                                    error={errors.schedule}
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
                                    <h3 className="text-lg font-semibold mb-4">Precio de venta</h3>
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
                                                    onBlur={(e) => markFieldAsTouched('price', e.target.value)}
                                                    className={`pl-8 ${shouldShowError('price', errors.price, data.price) ? 'border-red-500' : ''}`}
                                                    step="0.01"
                                                    min="0"
                                                />
                                            </div>
                                            <CustomError 
                                                message={getErrorMessage('price', errors.price, data.price)} 
                                                show={shouldShowError('price', errors.price, data.price)}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Mapa de Ubicación */}
                            <Card>
                                <CardContent className="pt-6">
                                    <h3 className="text-lg font-semibold mb-4">Ubicación en el mapa *</h3>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Selecciona la ubicación exacta de tu producto o servicio en el mapa
                                    </p>
                                    <MapPicker
                                        lat={data.lat ? parseFloat(data.lat) : -0.2299}
                                        lng={data.lng ? parseFloat(data.lng) : -78.5249}
                                        onLocationChange={(lat, lng) => {
                                            handleLocationChange(lat, lng);
                                        }}
                                        onBlur={() => markFieldAsTouched('location', `${data.lat},${data.lng}`)}
                                        className="h-64 w-full"
                                    />
                                    <CustomError 
                                        message={getErrorMessage('location', errors.location, `${data.lat},${data.lng}`)} 
                                        show={shouldShowError('location', errors.location, `${data.lat},${data.lng}`)}
                                    />
                                </CardContent>
                            </Card>

                            {/* Imágenes */}
                            <Card>
                                <CardContent className="pt-6">
                                    <h3 className="text-lg font-semibold mb-4">Imágenes</h3>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Agrega hasta 5 imágenes de tu producto (máximo 5MB cada una)
                                    </p>

                                    {/* Upload Area */}
                                    <div
                                        className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
                                            selectedImages.length >= 5 
                                                ? 'border-gray-200 bg-gray-50 cursor-not-allowed' 
                                                : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/30 cursor-pointer group'
                                        }`}
                                        onClick={() => {
                                            if (selectedImages.length < 5) {
                                                fileInputRef.current?.click();
                                            }
                                        }}
                                        onBlur={() => markFieldAsTouched('images', selectedImages.length > 0 ? 'has_images' : '')}
                                    >
                                        <div className="flex flex-col items-center space-y-4">
                                            <div className={`p-4 rounded-full transition-colors duration-300 ${
                                                selectedImages.length >= 5 
                                                    ? 'bg-gray-100' 
                                                    : 'bg-blue-100 group-hover:bg-blue-200'
                                            }`}>
                                                <Upload className={`w-8 h-8 transition-colors duration-300 ${
                                                    selectedImages.length >= 5 
                                                        ? 'text-gray-400' 
                                                        : 'text-blue-500 group-hover:text-blue-600'
                                                }`} />
                                            </div>
                                            <div>
                                                <p className={`text-lg font-medium transition-colors duration-300 ${
                                                    selectedImages.length >= 5 
                                                        ? 'text-gray-400' 
                                                        : 'text-gray-700 group-hover:text-blue-600'
                                                }`}>
                                                    {selectedImages.length >= 5 ? 'Límite alcanzado' : 'Subir imágenes'}
                                                </p>
                                                <p className={`text-sm mt-1 transition-colors duration-300 ${
                                                    selectedImages.length >= 5 
                                                        ? 'text-gray-400' 
                                                        : 'text-gray-500 group-hover:text-blue-500'
                                                }`}>
                                                    {selectedImages.length >= 5 
                                                        ? 'Ya has subido el máximo de imágenes' 
                                                        : 'Arrastra y suelta o haz clic para seleccionar'
                                                    }
                                                </p>
                                            </div>
                                            {selectedImages.length < 5 && (
                                                <div className="flex items-center space-x-2 text-xs text-gray-400">
                                                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                                                    <span>Máximo 5MB por imagen</span>
                                                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                                                    <span>Formatos: JPG, PNG, GIF</span>
                                                </div>
                                            )}
                                        </div>
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
                                        <div className="mt-6">
                                            <h4 className="text-sm font-medium text-gray-700 mb-3">
                                                Imágenes seleccionadas ({imagePreviews.length}/5)
                                            </h4>
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                                {imagePreviews.map((preview, index) => (
                                                    <div key={index} className="relative group">
                                                        <div className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-300 transition-colors duration-200 shadow-sm hover:shadow-md">
                                                            <img
                                                                src={preview}
                                                                alt={`Preview ${index + 1}`}
                                                                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                                                            />
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="destructive"
                                                            size="sm"
                                                            className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:scale-110"
                                                            onClick={() => removeImage(index)}
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </Button>
                                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                            <p className="text-white text-xs font-medium">
                                                                Imagen {index + 1}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <CustomError 
                                        message={getErrorMessage('images', errors.images, selectedImages.length > 0 ? 'has_images' : '')} 
                                        show={shouldShowError('images', errors.images, selectedImages.length > 0 ? 'has_images' : '')}
                                    />
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
                                    disabled={processing || !isFormValid()}
                                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                    {processing ? 'Creando...' : 'Crear Publicación'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
}

// Layout estático de Inertia
CreatePublication.layout = (page: React.ReactNode) => (
    <AppLayout breadcrumbs={[
        {
            title: 'Mis Publicaciones',
            href: '/my-publications',
        },
        {
            title: 'Crear Publicación',
            href: '/my-publications/create',
        },
    ]}>
        {page}
    </AppLayout>
);
