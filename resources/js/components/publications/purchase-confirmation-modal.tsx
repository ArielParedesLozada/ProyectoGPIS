import { ShoppingCart, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import GeneralModal from "@/components/ui/general-modal";

interface PurchaseConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isPurchasing?: boolean;
    publicationTitle?: string;
    price?: number;
}

export default function PurchaseConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    isPurchasing = false,
    publicationTitle = "este producto",
    price = 0
}: PurchaseConfirmationModalProps) {
    return (
        <GeneralModal
            isOpen={isOpen}
            onClose={onClose}
            title="Confirmar compra"
            className="max-w-md"
        >
            <div className="space-y-4">
                {/* Icono de compra */}
                <div className="flex items-center justify-center w-16 h-16 mx-auto bg-green-100 rounded-full">
                    <ShoppingCart className="w-8 h-8 text-green-600" />
                </div>

                {/* Mensaje de confirmación */}
                <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        ¿Estás seguro de comprar este producto?
                    </h3>
                    <p className="text-gray-600 mb-3">
                        Estás a punto de comprar{" "}
                        <span className="font-medium text-gray-900">
                            {publicationTitle}
                        </span>
                    </p>
                    {price > 0 && (
                        <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-sm text-gray-600">Precio total</p>
                            <p className="text-2xl font-bold text-gray-900">${price}</p>
                        </div>
                    )}
                </div>

                {/* Botones de acción */}
                <div className="flex gap-3 pt-4">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isPurchasing}
                        className="flex-1"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={onConfirm}
                        disabled={isPurchasing}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                        {isPurchasing ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                Procesando...
                            </>
                        ) : (
                            <>
                                <ShoppingCart className="w-4 h-4 mr-2" />
                                Comprar
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </GeneralModal>
    );
}
