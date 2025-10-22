import { useState, useRef } from "react";
import { useForm, router } from "@inertiajs/react";
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
import { Upload, X, AlertCircle } from "lucide-react";
import { Category } from "@/types";
import MapPicker from "./MapPicker";
import ServiceSchedule from "./ServiceSchedule";
import { useToast } from "@/hooks/useToast";

interface CreatePublicationModalProps {
    categories: Category[];
    onClose: () => void;
}

export default function CreatePublicationModal({ categories, onClose }: CreatePublicationModalProps) {
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { showToast } = useToast();

    const { data, setData, post, processing, errors } = useForm({
        title: '',
        description: '',
        price: '',
        category_id: '',
        type: '',
        location: '',
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
        
        // Crear FormData manualmente para asegurar que los archivos se envíen
        const formData = new FormData();
        formData.append('title', data.title);
        formData.append('description', data.description);
        formData.append('price', data.price);
        formData.append('category_id', data.category_id);
        formData.append('type', data.type);
        formData.append('location', data.location);
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
                onClose();
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
        <form onSubmit={handleSubmit} className="space-y-8">
            {/* Información Básica */}
            <Card className="bg-white shadow-sm">
                <CardContent className="pt-8 pb-8">
                    <h3 className="text-xl font-semibold mb-6 text-gray-900">Detalles principales de tu publicación</h3>
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
                            <Select value={data.type} onValueChange={(value) => setData('type', value)}>
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
                                    onChange={(value) => setData('horario', value)}
                                    error={errors.horario}
                                    required={true}
                                />
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Precio y Ubicación */}
            <Card className="bg-white shadow-sm">
                <CardContent className="pt-8 pb-8">
                    <h3 className="text-xl font-semibold mb-6 text-gray-900">Información comercial</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                        {/* Ubicación */}
                        <div>
                            <Label htmlFor="location">Ubicación *</Label>
                            <Input
                                id="location"
                                type="text"
                                placeholder="Ciudad, País"
                                value={data.location}
                                onChange={(e) => setData('location', e.target.value)}
                                className={errors.location ? 'border-red-500' : ''}
                            />
                            {errors.location && (
                                <div className="flex items-center gap-1 mt-1 text-red-500 text-sm">
                                    <AlertCircle className="w-4 h-4" />
                                    {errors.location}
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Mapa de Ubicación */}
            <Card className="bg-white shadow-sm">
                <CardContent className="pt-8 pb-8">
                    <h3 className="text-xl font-semibold mb-6 text-gray-900">Ubicación en el mapa</h3>
                    <MapPicker
                        lat={data.lat ? parseFloat(data.lat) : -0.2299}
                        lng={data.lng ? parseFloat(data.lng) : -78.5249}
                        onLocationChange={handleLocationChange}
                        className="h-64 w-full"
                    />
                </CardContent>
            </Card>

            {/* Imágenes */}
            <Card className="bg-white shadow-sm">
                <CardContent className="pt-8 pb-8">
                    <h3 className="text-xl font-semibold mb-6 text-gray-900">Imágenes</h3>
                    <p className="text-sm text-gray-600 mb-6">
                        Agrega hasta 5 imágenes de tu producto (máximo 5MB cada una)
                    </p>

                    {/* Upload Area */}
                    <div
                        className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-gray-400 transition-colors cursor-pointer bg-gray-50"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Upload className="w-16 h-16 text-gray-400 mx-auto mb-6" />
                        <p className="text-lg font-medium text-gray-600 mb-2">Subir</p>
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
            <div className="flex justify-end gap-4 pt-8 border-t border-gray-200">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={processing}
                    className="px-8 py-3 text-gray-700 border-gray-300 hover:bg-gray-50"
                >
                    Cancelar
                </Button>
                <Button
                    type="submit"
                    disabled={processing}
                    className="bg-blue-600 hover:bg-blue-700 px-8 py-3 text-white font-medium"
                >
                    {processing ? 'Publicando...' : 'Publicar Producto'}
                </Button>
            </div>
        </form>
    );
}
