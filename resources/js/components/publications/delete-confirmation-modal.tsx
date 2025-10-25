import { Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import GeneralModal from "@/components/ui/general-modal";

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isDeleting?: boolean;
    publicationTitle?: string;
}

export default function DeleteConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    isDeleting = false,
    publicationTitle = "esta publicación"
}: DeleteConfirmationModalProps) {
    return (
        <GeneralModal
            isOpen={isOpen}
            onClose={onClose}
            title="Confirmar eliminación"
            className="max-w-md"
        >
            <div className="space-y-4">
                {/* Icono de advertencia */}
                <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-full">
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>

                {/* Mensaje de confirmación */}
                <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        ¿Estás seguro?
                    </h3>
                    <p className="text-gray-600">
                        Esta acción no se puede deshacer. Se eliminará permanentemente{" "}
                        <span className="font-medium text-gray-900">
                            {publicationTitle}
                        </span>{" "}
                        y todos sus datos asociados.
                    </p>
                </div>

                {/* Botones de acción */}
                <div className="flex gap-3 pt-4">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isDeleting}
                        className="flex-1"
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="flex-1"
                    >
                        {isDeleting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                Eliminando...
                            </>
                        ) : (
                            <>
                                <Trash2 className="w-4 h-4 mr-2" />
                                Eliminar
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </GeneralModal>
    );
}
