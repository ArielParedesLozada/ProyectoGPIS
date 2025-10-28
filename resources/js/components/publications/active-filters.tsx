import React from 'react';
import { X, MapPin, DollarSign, Tag, Package } from 'lucide-react';
import { router } from '@inertiajs/react';

interface FilterChipProps {
  label: string;
  icon?: React.ReactNode;
  onRemove: () => void;
}

const FilterChip: React.FC<FilterChipProps> = ({ label, icon, onRemove }) => {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium border border-blue-200">
      {icon && <span className="text-blue-600">{icon}</span>}
      <span>{label}</span>
      <button
        onClick={onRemove}
        className="text-blue-600 hover:text-blue-800 transition-colors"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
};

interface ActiveFiltersProps {
  selectedCategory?: number;
  selectedCategories?: number[];
  selectedType?: string;
  selectedMinPrice?: number;
  selectedMaxPrice?: number;
  nearLat?: number;
  nearLng?: number;
  radiusKm?: number;
  categories: Array<{ id: number; name: string }>;
}

export default function ActiveFilters({
  selectedCategory,
  selectedCategories,
  selectedType,
  selectedMinPrice,
  selectedMaxPrice,
  nearLat,
  nearLng,
  radiusKm,
  categories
}: ActiveFiltersProps) {
  const activeFilters = [];

  // Categorías múltiples
  if (selectedCategories && selectedCategories.length > 0) {
    selectedCategories.forEach(categoryId => {
      const category = categories.find(c => c.id === categoryId);
      if (category) {
        activeFilters.push({
          key: `category-${categoryId}`,
          label: category.name,
          icon: <Tag className="h-3 w-3" />,
          onRemove: () => {
            const query = new URLSearchParams(window.location.search);
            const currentCategories = query.get('categories')?.split(',') || [];
            const newCategories = currentCategories.filter(id => id !== categoryId.toString());
            
            if (newCategories.length > 0) {
              query.set('categories', newCategories.join(','));
            } else {
              query.delete('categories');
            }
            
            router.get(`/publication?${query.toString()}`, {}, {
              preserveState: true,
              replace: true,
            });
          }
        });
      }
    });
  } else if (selectedCategory) {
    // Mantener compatibilidad con categoría única
    const category = categories.find(c => c.id === selectedCategory);
    if (category) {
      activeFilters.push({
        key: 'category',
        label: category.name,
        icon: <Tag className="h-3 w-3" />,
        onRemove: () => {
          const query = new URLSearchParams(window.location.search);
          query.delete('category_id');
          router.get(`/publication?${query.toString()}`, {}, {
            preserveState: true,
            replace: true,
          });
        }
      });
    }
  }

  // Tipo
  if (selectedType && selectedType !== 'all') {
    activeFilters.push({
      key: 'type',
      label: selectedType === 'producto' ? 'Producto' : 'Servicio',
      icon: <Package className="h-3 w-3" />,
      onRemove: () => {
        const query = new URLSearchParams(window.location.search);
        query.delete('type');
        router.get(`/publication?${query.toString()}`, {}, {
          preserveState: true,
          replace: true,
        });
      }
    });
  }

  // Precio
  if (selectedMinPrice || selectedMaxPrice) {
    const priceLabel = selectedMinPrice && selectedMaxPrice 
      ? `$${selectedMinPrice} - $${selectedMaxPrice}`
      : selectedMinPrice 
        ? `Desde $${selectedMinPrice}`
        : `Hasta $${selectedMaxPrice}`;
    
    activeFilters.push({
      key: 'price',
      label: priceLabel,
      icon: <DollarSign className="h-3 w-3" />,
      onRemove: () => {
        const query = new URLSearchParams(window.location.search);
        query.delete('min_price');
        query.delete('max_price');
        router.get(`/publication?${query.toString()}`, {}, {
          preserveState: true,
          replace: true,
        });
      }
    });
  }

  // Ubicación
  if (nearLat && nearLng && radiusKm) {
    activeFilters.push({
      key: 'location',
      label: `Radio ${radiusKm} km`,
      icon: <MapPin className="h-3 w-3" />,
      onRemove: () => {
        const query = new URLSearchParams(window.location.search);
        query.delete('near_lat');
        query.delete('near_lng');
        query.delete('radius_km');
        router.get(`/publication?${query.toString()}`, {}, {
          preserveState: true,
          replace: true,
        });
      }
    });
  }

  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {activeFilters.map((filter) => (
        <FilterChip
          key={filter.key}
          label={filter.label}
          icon={filter.icon}
          onRemove={filter.onRemove}
        />
      ))}
    </div>
  );
}
