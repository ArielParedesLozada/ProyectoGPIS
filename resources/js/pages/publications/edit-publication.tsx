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
import { Category, Publication } from "@/types";
import AppLayout from "@/layouts/app-layout";
import { Head, Link, router } from "@inertiajs/react";
import { BreadcrumbItem } from "@/types";
import MapPicker from "@/components/publications/MapPicker";
import ServiceSchedule from "@/components/publications/ServiceSchedule";
import { useToast } from "@/hooks/useToast";
import ErrorMessage from "@/components/ui/error-message";

interface EditPublicationProps {
    publication: Publication & {
        images: Array<{ id: number; image_url: string; }>;
    };
    categories: Category[];
}

export default function EditPublication({ publication, categories }: EditPublicationProps) {
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [existingImages, setExistingImages] = useState(publication.images || []);
    const [hasChanges, setHasChanges] = useState(false);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { showToast } = useToast();

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Mis Publicaciones',
            href: '/my-publications',
        },
        {
            title: 'Editar Publicación',
            href: `/my-publications/${publication.id}/edit`,
        },
    ];

    const { data, setData, put, processing, errors } = useForm({
        title: publication.title,
        description: publication.description || '',
        price: publication.price.toString(),
        category_id: publication.category_id.toString(),
        type: publication.type,
        lat: publication.location_point?.lat?.toString() || '',
        lng: publication.location_point?.lng?.toString() || '',
        horario: publication.horario || '',
        images: [] as File[]
    });

    // Función para validar campos en tiempo real
    const validateField = (field: string, value: string | number) => {
        const newErrors = { ...validationErrors };
        
        switch (field) {
            case 'title':
                if (!value || (typeof value === 'string' && value.trim().length === 0)) {
                    newErrors.title = 'El título es requerido';
                } else if (typeof value === 'string' && value.trim().length < 3) {
                    newErrors.title = 'El título debe tener al menos 3 caracteres';
                } else {
                    delete newErrors.title;
                }
                break;
                
            case 'description':
                if (!value || (typeof value === 'string' && value.trim().length === 0)) {
                    newErrors.description = 'La descripción es requerida';
                } else if (typeof value === 'string' && value.trim().length < 10) {
                    newErrors.description = 'La descripción debe tener al menos 10 caracteres';
                } else {
                    delete newErrors.description;
                }
                break;
                
            case 'price':
                if (!value || value === '') {
                    newErrors.price = 'El precio es requerido';
                } else if (isNaN(Number(value)) || Number(value) <= 0) {
                    newErrors.price = 'El precio debe ser un número válido mayor a 0';
                } else {
                    delete newErrors.price;
                }
                break;
                
            case 'category_id':
                if (!value || value === '') {
                    newErrors.category_id = 'La categoría es requerida';
                } else {
                    delete newErrors.category_id;
                }
                break;
                
            case 'type':
                if (!value || value === '') {
                    newErrors.type = 'El tipo es requerido';
                } else {
                    delete newErrors.type;
                }
                break;
                
            case 'horario':
                if (data.type === 'servicio' && (!value || value === '')) {
                    newErrors.horario = 'El horario es requerido para servicios';
                } else {
                    delete newErrors.horario;
                }
                break;
        }
        
        setValidationErrors(newErrors);
    };

    // Validar ubicación
    const validateLocation = () => {
        const newErrors = { ...validationErrors };
        if (!data.lat || !data.lng || data.lat === '' || data.lng === '') {
            newErrors.location = 'Debes seleccionar una ubicación en el mapa';
        } else {
            delete newErrors.location;
        }
        setValidationErrors(newErrors);
    };

    // Validar imágenes
    const validateImages = () => {
        const newErrors = { ...validationErrors };
        if (selectedImages.length === 0 && existingImages.length === 0) {
            newErrors.images = 'Debes tener al menos una imagen';
        } else {
            delete newErrors.images;
        }
        setValidationErrors(newErrors);
    };

    // Efecto para validar ubicación cuando cambie
    useEffect(() => {
        validateLocation();
    }, [data.lat, data.lng]);

    // Efecto para validar imágenes cuando cambien
    useEffect(() => {
        validateImages();
    }, [selectedImages, existingImages]);

    // Detectar cambios en el formulario
    useEffect(() => {
        const hasFormChanges = 
            data.title !== publication.title ||
            data.description !== (publication.description || '') ||
            data.price !== publication.price.toString() ||
            data.category_id !== publication.category_id.toString() ||
            data.type !== publication.type ||
            data.lat !== (publication.location_point?.lat?.toString() || '') ||
            data.lng !== (publication.location_point?.lng?.toString() || '') ||
            data.horario !== (publication.horario || '') ||
            selectedImages.length > 0 ||
            existingImages.length !== publication.images.length;

        setHasChanges(hasFormChanges);
    }, [data, selectedImages, existingImages, publication]);

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

        const newImages = [...selectedImages, ...files];
        setSelectedImages(newImages);
        
        // Actualizar el form data con las imágenes
        setData('images', newImages);

        // Create previews
        const newPreviews = files.map(file => URL.createObjectURL(file));
        setImagePreviews([...imagePreviews, ...newPreviews]);
        
        // Limpiar el input para permitir seleccionar el mismo archivo otra vez
        if (e.target) {
            e.target.value = '';
        }
    };

    const removeImage = (index: number) => {
        const newImages = selectedImages.filter((_, i) => i !== index);
        const newPreviews = imagePreviews.filter((_, i) => i !== index);
        
        setSelectedImages(newImages);
        setImagePreviews(newPreviews);
        setData('images', newImages);
    };

    const removeExistingImage = (index: number) => {
        setExistingImages(existingImages.filter((_, i) => i !== index));
    };

    const handleLocationChange = (lat: number, lng: number) => {
        // Redondear coordenadas a 6 decimales para mayor precisión
        const roundedLat = Math.round(lat * 1000000) / 1000000;
        const roundedLng = Math.round(lng * 1000000) / 1000000;
        
        setData('lat', roundedLat.toString());
        setData('lng', roundedLng.toString());
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validar todos los campos antes de enviar
        validateField('title', data.title);
        validateField('description', data.description);
        validateField('price', data.price);
        validateField('category_id', data.category_id);
        validateField('type', data.type);
        if (data.type === 'servicio') {
            validateField('horario', data.horario);
        }
        validateLocation();
        validateImages();
        
        // Verificar si hay errores de validación
        const hasErrors = Object.keys(validationErrors).length > 0;
        if (hasErrors) {
            showToast({
                type: 'error',
                title: 'Formulario incompleto',
                message: 'Por favor completa todos los campos requeridos correctamente.'
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
        
        // Agregar IDs de imágenes existentes que se mantienen
        existingImages.forEach((image) => {
            formData.append('existing_images[]', image.id.toString());
        });
        
        // Agregar método PUT
        formData.append('_method', 'PUT');
        
        // Enviar FormData directamente
        router.post(`/my-publications/${publication.id}`, formData, {
            forceFormData: true,
            onSuccess: () => {
                // Limpiar imágenes seleccionadas después del éxito
                setSelectedImages([]);
                setImagePreviews([]);
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
        <>
            <Head title="Editar Publicación" />
            
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
                        <h1 className="text-2xl font-bold text-gray-900 mb-6">Editar Publicación</h1>

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
                                                onChange={(e) => {
                                                    setData('title', e.target.value);
                                                    validateField('title', e.target.value);
                                                }}
                                                className={errors.title || validationErrors.title ? 'border-red-500' : ''}
                                            />
                                            <ErrorMessage error={errors.title || validationErrors.title} />
                                        </div>

                                        {/* Descripción */}
                                        <div>
                                            <Label htmlFor="description">Descripción *</Label>
                                            <Textarea
                                                id="description"
                                                placeholder="Describe tu producto o servicio en detalle..."
                                                value={data.description}
                                                onChange={(e) => {
                                                    setData('description', e.target.value);
                                                    validateField('description', e.target.value);
                                                }}
                                                rows={4}
                                                className={errors.description || validationErrors.description ? 'border-red-500' : ''}
                                            />
                                            <ErrorMessage error={errors.description || validationErrors.description} />
                                        </div>

                                        {/* Categoría */}
                                        <div>
                                            <Label htmlFor="category_id">Categoría *</Label>
                                            <Select value={data.category_id} onValueChange={(value) => {
                                                setData('category_id', value);
                                                validateField('category_id', value);
                                            }}>
                                                <SelectTrigger className={errors.category_id || validationErrors.category_id ? 'border-red-500' : ''}>
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
                                            <ErrorMessage error={errors.category_id || validationErrors.category_id} />
                                        </div>

                                        {/* Tipo */}
                                        <div>
                                            <Label htmlFor="type">Tipo *</Label>
                                            <Select value={data.type} onValueChange={(value: "servicio" | "producto") => {
                                                setData('type', value);
                                                validateField('type', value);
                                            }}>
                                                <SelectTrigger className={errors.type || validationErrors.type ? 'border-red-500' : ''}>
                                                    <SelectValue placeholder="Selecciona el tipo" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="producto">Producto</SelectItem>
                                                    <SelectItem value="servicio">Servicio</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <ErrorMessage error={errors.type || validationErrors.type} />
                                        </div>

                                        {/* Horario de atención (solo para servicios) */}
                                        {data.type === 'servicio' && (
                                            <div>
                                                <ServiceSchedule
                                                    value={data.horario}
                                                    onChange={(value: string) => {
                                                        setData('horario', value);
                                                        validateField('horario', value);
                                                    }}
                                                    error={errors.horario || validationErrors.horario}
                                                    required={true}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Precio de venta */}
                            <Card>
                                <CardContent className="pt-6">
                                    <h3 className="text-lg font-semibold mb-4">Precio de venta</h3>
                                    <div className="space-y-4">
                                        {/* Precio */}
                                        <div>
                                            <Label htmlFor="price">Precio *</Label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                                                <Input
                                                    id="price"
                                                    type="number"
                                                    placeholder="0.00"
                                                    value={data.price}
                                                    onChange={(e) => {
                                                        setData('price', e.target.value);
                                                        validateField('price', e.target.value);
                                                    }}
                                                    className={`pl-8 ${errors.price || validationErrors.price ? 'border-red-500' : ''}`}
                                                    step="0.01"
                                                    min="0"
                                                />
                                            </div>
                                            <ErrorMessage error={errors.price || validationErrors.price} />
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
                                        lat={data.lat && data.lat !== '' ? parseFloat(data.lat) : undefined}
                                        lng={data.lng && data.lng !== '' ? parseFloat(data.lng) : undefined}
                                        onLocationChange={handleLocationChange}
                                        className="h-64 w-full"
                                    />
                                    <ErrorMessage error={validationErrors.location} />
                                </CardContent>
                            </Card>

                            {/* Imágenes Existentes */}
                            {existingImages.length > 0 && (
                                <Card>
                                    <CardContent className="pt-6">
                                        <h3 className="text-lg font-semibold mb-4">Imágenes Actuales</h3>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            {existingImages.map((image, index) => (
                                                <div key={image.id} className="relative">
                                                    <img
                                                        src={`/storage/${image.image_url}`}
                                                        alt={`Imagen ${index + 1}`}
                                                        className="w-full h-32 object-cover rounded-lg"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="sm"
                                                        className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full"
                                                        onClick={() => removeExistingImage(index)}
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Nuevas Imágenes */}
                            <Card>
                                <CardContent className="pt-6">
                                    <h3 className="text-lg font-semibold mb-4">Agregar Nuevas Imágenes</h3>
                                    <p className="text-sm text-gray-600 mb-4">
                                        Agrega hasta 5 imágenes adicionales (máximo 5MB cada una)
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

                                    <ErrorMessage error={errors.images || validationErrors.images} />
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
                                    disabled={processing || !hasChanges}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    {processing ? 'Guardando...' : 'Guardar Cambios'}
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
EditPublication.layout = (page: React.ReactNode) => (
    <AppLayout breadcrumbs={[
        {
            title: 'Mis Publicaciones',
            href: '/my-publications',
        },
        {
            title: 'Editar Publicación',
            href: '/my-publications',
        },
    ]}>
        {page}
    </AppLayout>
);
