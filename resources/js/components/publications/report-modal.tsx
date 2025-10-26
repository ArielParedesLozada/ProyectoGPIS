import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import GeneralModal from "@/components/ui/general-modal";
import { router } from "@inertiajs/react";
import { useToast } from "@/hooks/useToast";

interface ReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    publicationId: number;
    publicationTitle: string;
}

const reportReasons = [
    "Estafa",
    "Venta o promoción de artículos restringidos",
    "Publicación imprecisa",
    "Desnudos o actividad sexual",
    "Violencia, odio o explotación",
    "Bullying o acoso",
    "Suicidio, autolesión o trastornos alimentarios"
];

export default function ReportModal({ isOpen, onClose, publicationId, publicationTitle }: ReportModalProps) {
    const [selectedReason, setSelectedReason] = useState<string>("");
    const [showConfirmation, setShowConfirmation] = useState(false);
    const { showToast } = useToast();

    const handleReasonClick = (reason: string) => {
        setSelectedReason(reason);
        setShowConfirmation(true);
    };

    const handleBack = () => {
        setShowConfirmation(false);
        setSelectedReason("");
    };

    const handleSubmit = () => {
        router.post(`/publication/${publicationId}/report`, {
            reason: selectedReason,
            description: null,
        }, {
            onSuccess: (page) => {
                // Mostrar mensaje de éxito con toast
                const message = (page.props as any).flash?.success || 'Reporte enviado correctamente. Nuestro equipo de moderación revisará el contenido.';
                showToast({
                    type: 'success',
                    title: 'Reporte enviado',
                    message: message,
                    duration: 5000
                });
                onClose();
                setShowConfirmation(false);
                setSelectedReason("");
            },
            onError: (errors) => {
                console.error('Error al enviar reporte:', errors);
                // Mostrar el primer error disponible con toast
                const errorMessage = errors.error || Object.values(errors)[0] || 'Error al enviar el reporte. Inténtalo nuevamente.';
                showToast({
                    type: 'error',
                    title: 'Error al enviar reporte',
                    message: errorMessage,
                    duration: 5000
                });
            }
        });
    };

    return (
        <GeneralModal
            isOpen={isOpen}
            onClose={onClose}
            title="Reportar"
            showBackButton={showConfirmation}
            onBack={handleBack}
        >
            {showConfirmation ? (
                <>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Vas a enviar un reporte</h3>
                    
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                        <div className="flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-amber-800">
                                We will remove content if it goes against our <span className="font-medium text-amber-900">Políticas de comercio</span> or <span className="font-medium text-amber-900">Normas comunitarias</span>.
                            </p>
                        </div>
                    </div>

                    <Card className="mb-6">
                        <CardContent className="pt-4">
                            <h4 className="font-medium text-gray-900 mb-3">Detalles del reporte</h4>
                            <div className="bg-gray-50 rounded-lg p-4">
                                <p className="text-gray-600 text-sm mb-2">¿Por qué quieres reportar esta publicación?</p>
                                <p className="font-medium text-gray-900">{selectedReason}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Button
                        onClick={handleSubmit}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg"
                    >
                        Enviar
                    </Button>
                </>
            ) : (
                <>
                    <p className="text-gray-900 font-semibold mb-2">
                        ¿Por qué quieres reportar esta publicación?
                    </p>
                    
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                        <div className="flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-yellow-800">
                                Si alguien se encuentra en peligro inminente, busca ayuda antes de enviar un reporte. No esperes.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {reportReasons.map((reason, index) => (
                            <button
                                key={index}
                                onClick={() => handleReasonClick(reason)}
                                className="w-full flex items-center justify-between p-3 text-gray-900 hover:bg-gray-50 transition-colors text-left border border-gray-200 rounded-lg"
                            >
                                <span className="font-medium">{reason}</span>
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </GeneralModal>
    );
}
