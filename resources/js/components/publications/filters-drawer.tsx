import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import PublicationFiltersCheckbox from './publication-filters-checkbox';

interface FiltersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Array<{ id: number; name: string }>;
  selectedCategory?: number;
  selectedCategories?: number[];
  selectedType?: string;
  selectedMinPrice?: number;
  selectedMaxPrice?: number;
  nearLat?: number;
  nearLng?: number;
  radiusKm?: number;
  myProducts?: boolean;
}

// Constante para el ancho del panel de filtros - mismo que app-layout
const FILTER_PANEL_WIDTH_PX = 256; // 16rem = 256px (mismo que SIDEBAR_WIDTH)

export default function FiltersDrawer({
  isOpen,
  onClose,
  categories,
  selectedCategory,
  selectedCategories,
  selectedType,
  selectedMinPrice,
  selectedMaxPrice,
  nearLat,
  nearLng,
  radiusKm,
  myProducts
}: FiltersDrawerProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  return (
    <>
      {/* Sheet para móvil - solo visible en móvil */}
      <Sheet open={isOpen && isMobile} onOpenChange={onClose}>
        <SheetHeader className="sr-only">
          <SheetTitle>Filtros</SheetTitle>
          <SheetDescription>Panel de filtros para publicaciones</SheetDescription>
        </SheetHeader>
        <SheetContent
          side="left"
          className="w-64 p-0 [&>button]:hidden"
        >
          <div className="flex flex-col h-full">
            {/* Header con título y botón de cierre */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
              <h2 className="text-lg font-semibold text-gray-900">Filtros</h2>
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Contenido principal con scroll */}
            <div className="flex-1 overflow-y-auto p-6 bg-white">
              <PublicationFiltersCheckbox
                categories={categories}
                selectedCategory={selectedCategory}
                selectedCategories={selectedCategories}
                selectedType={selectedType}
                selectedMinPrice={selectedMinPrice}
                selectedMaxPrice={selectedMaxPrice}
                nearLat={nearLat}
                nearLng={nearLng}
                radiusKm={radiusKm}
                myProducts={myProducts}
              />
            </div>

            {/* Footer con botones de acción */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex gap-3">
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="flex-1 border-gray-300 hover:bg-gray-100"
                >
                  Cerrar
                </Button>
                <Button
                  onClick={() => {
                    // Limpiar todos los filtros y cerrar el drawer
                    window.location.href = '/publication';
                  }}
                  variant="outline"
                  className="flex-1 border-gray-300 hover:bg-gray-100"
                >
                  Limpiar todo
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Panel para desktop - se superpone sin overlay */}
      <div 
        className={`
          fixed top-0 h-full w-64 bg-white shadow-xl z-50 hidden md:block
          transition-all duration-300 ease-in-out
          ${isOpen ? 'left-0' : 'left-[-256px]'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header con título y botón de cierre */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
            <h2 className="text-lg font-semibold text-gray-900">Filtros</h2>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Contenido principal con scroll */}
          <div className="flex-1 overflow-y-auto p-6 bg-white">
            <PublicationFiltersCheckbox
              categories={categories}
              selectedCategory={selectedCategory}
              selectedCategories={selectedCategories}
              selectedType={selectedType}
              selectedMinPrice={selectedMinPrice}
              selectedMaxPrice={selectedMaxPrice}
              nearLat={nearLat}
              nearLng={nearLng}
              radiusKm={radiusKm}
              myProducts={myProducts}
            />
          </div>

          {/* Footer con botones de acción */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex gap-3">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1 border-gray-300 hover:bg-gray-100"
              >
                Cerrar
              </Button>
              <Button
                onClick={() => {
                  // Limpiar todos los filtros y cerrar el drawer
                  window.location.href = '/publication';
                }}
                variant="outline"
                className="flex-1 border-gray-300 hover:bg-gray-100"
              >
                Limpiar todo
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Exportar la constante para uso en otros componentes
export { FILTER_PANEL_WIDTH_PX };