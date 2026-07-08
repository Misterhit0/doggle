import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';

const DOG_BREEDS = [
  'Labrador',
  'Berger Allemand',
  'Golden Retriever',
  'Bulldog',
  'Caniche',
  'Beagle',
  'Rottweiler',
  'Cocker Spaniel',
  'Husky',
  'Dalmation',
  'Boxer',
  'Chihuahua',
  'Shiba Inu',
  'Autre',
];

const DOG_SIZES = [
  { value: 'small', label: 'Petit (< 10kg)' },
  { value: 'medium', label: 'Moyen (10-25kg)' },
  { value: 'large', label: 'Grand (25-40kg)' },
  { value: 'xlarge', label: 'Très grand (> 40kg)' },
];

interface WalkingMapFiltersProps {
  onFilterChange: (filters: { breed?: string; size?: string }) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function WalkingMapFilters({
  onFilterChange,
  isOpen,
  onToggle,
}: WalkingMapFiltersProps) {
  const [breed, setBreed] = useState<string>('');
  const [size, setSize] = useState<string>('');

  const handleBreedChange = (value: string) => {
    const newBreed = value === breed ? '' : value;
    setBreed(newBreed);
    onFilterChange({ breed: newBreed || undefined, size: size || undefined });
  };

  const handleSizeChange = (value: string) => {
    const newSize = value === size ? '' : value;
    setSize(newSize);
    onFilterChange({ breed: breed || undefined, size: newSize || undefined });
  };

  const handleReset = () => {
    setBreed('');
    setSize('');
    onFilterChange({});
  };

  return (
    <div className="absolute top-4 left-4 z-10">
      <Button
        onClick={onToggle}
        className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold mb-2"
      >
        {isOpen ? '✕ Fermer filtres' : '⚙️ Filtres'}
      </Button>

      {isOpen && (
        <Card className="w-80 p-6 border-2 border-primary/30 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-black">Filtrer les maîtres</h3>
            <button
              onClick={onToggle}
              className="text-gray-500 hover:text-black"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            {/* Breed Filter */}
            <div>
              <label className="block text-sm font-semibold text-black mb-2">
                Race du chien
              </label>
              <Select value={breed} onValueChange={handleBreedChange}>
                <SelectTrigger className="border-2 border-primary/30">
                  <SelectValue placeholder="Sélectionner une race..." />
                </SelectTrigger>
                <SelectContent>
                  {DOG_BREEDS.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {breed && (
                <div className="mt-2 inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-semibold">
                  {breed}
                  <button
                    onClick={() => handleBreedChange(breed)}
                    className="ml-2 hover:text-primary/70"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* Size Filter */}
            <div>
              <label className="block text-sm font-semibold text-black mb-2">
                Taille du chien
              </label>
              <Select value={size} onValueChange={handleSizeChange}>
                <SelectTrigger className="border-2 border-primary/30">
                  <SelectValue placeholder="Sélectionner une taille..." />
                </SelectTrigger>
                <SelectContent>
                  {DOG_SIZES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {size && (
                <div className="mt-2 inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-semibold">
                  {DOG_SIZES.find((s) => s.value === size)?.label}
                  <button
                    onClick={() => handleSizeChange(size)}
                    className="ml-2 hover:text-primary/70"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* Reset Button */}
            {(breed || size) && (
              <Button
                onClick={handleReset}
                variant="outline"
                className="w-full border-2 border-primary text-primary hover:bg-primary/10"
              >
                Réinitialiser les filtres
              </Button>
            )}
          </div>

          <div className="mt-4 p-3 bg-peach-50 rounded-lg border border-primary/20">
            <p className="text-xs text-gray-600">
              💡 <strong>Conseil :</strong> Utilisez les filtres pour trouver des maîtres avec des chiens compatibles à vos préférences.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
