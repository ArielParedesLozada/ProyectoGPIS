import { ReactNode } from "react";
import { X, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GeneralModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  showBackButton?: boolean;
  onBack?: () => void;
  className?: string;
}

export default function GeneralModal({
  isOpen,
  onClose,
  title,
  children,
  showBackButton = false,
  onBack,
  className = "",
}: GeneralModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Overlay solo sobre el área de contenido principal */}
      <div className="fixed top-0 right-0 bottom-0 left-64 z-40 bg-white/20 backdrop-blur-md" />

      {/* Modal centrado a nivel de pantalla completa */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={`bg-white rounded-2xl shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto ${className}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              {showBackButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  className="p-2 hover:bg-gray-100"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-2 hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Contenido */}
          <div className="p-6">{children}</div>
        </div>
      </div>
    </>
  );
}
