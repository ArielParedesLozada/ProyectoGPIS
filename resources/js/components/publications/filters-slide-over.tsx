import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PublicationFiltersCheckbox from './publication-filters-checkbox';

interface FiltersSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Array<{ id: number; name: string }>;
  selectedCategory?: number;
  selectedType?: string;
  selectedMinPrice?: number;
  selectedMaxPrice?: number;
  nearLat?: number;
  nearLng?: number;
  radiusKm?: number;
  myProducts?: boolean;
}

export default function FiltersSlideOver({
  isOpen,
  onClose,
  categories,
  selectedCategory,
  selectedType,
  selectedMinPrice,
  selectedMaxPrice,
  nearLat,
  nearLng,
  radiusKm,
  myProducts
}: FiltersSlideOverProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Overlay - solo cubre el área derecha */}
      <div 
        className="fixed top-0 right-0 h-full w-full bg-black bg-opacity-30 z-40"
        style={{ marginLeft: '384px' }}
        onClick={onClose}
      />
      
      {/* Slide-over desde la izquierda */}
      <div className="fixed left-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Filtros</h2>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <PublicationFiltersCheckbox
              categories={categories}
              selectedCategory={selectedCategory}
              selectedType={selectedType}
              selectedMinPrice={selectedMinPrice}
              selectedMaxPrice={selectedMaxPrice}
              nearLat={nearLat}
              nearLng={nearLng}
              radiusKm={radiusKm}
              myProducts={myProducts}
            />
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex gap-3">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1"
              >
                Cerrar
              </Button>
              <Button
                onClick={() => {
                  // Limpiar todos los filtros
                  window.location.href = '/publication';
                }}
                variant="outline"
                className="flex-1"
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
