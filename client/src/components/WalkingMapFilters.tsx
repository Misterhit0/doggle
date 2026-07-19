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
        className="bg-[#FFFDF9] text-black hover:bg-gray-50 border-2 border-black font-black shadow-[3px_3px_0px_rgba(0,0,0,1)] uppercase text-xs rounded-none mb-2"
      >
        {isOpen ? '✕ Fermer' : '⚙️ Filtres'}
      </Button>

      {isOpen && (
        <Card className="w-80 p-6 border-2 border-black bg-[#FFFDF9] shadow-[6px_6px_0px_rgba(0,0,0,1)] rounded-none">
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
              <label className="block text-xs font-black uppercase mb-1 text-black">
                Race du chien
              </label>
              <Select value={breed} onValueChange={handleBreedChange}>
                <SelectTrigger className="border-2 border-black rounded-none">
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
                <div className="mt-2 inline-block bg-pink-100 border border-black text-black px-2.5 py-0.5 rounded-none text-xs font-black uppercase">
                  {breed}
                  <button
                    onClick={() => handleBreedChange(breed)}
                    className="ml-2 hover:text-rose-600"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* Size Filter */}
            <div>
              <label className="block text-xs font-black uppercase mb-1 text-black">
                Taille du chien
              </label>
              <Select value={size} onValueChange={handleSizeChange}>
                <SelectTrigger className="border-2 border-black rounded-none">
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
                <div className="mt-2 inline-block bg-pink-100 border border-black text-black px-2.5 py-0.5 rounded-none text-xs font-black uppercase">
                  {DOG_SIZES.find((s) => s.value === size)?.label}
                  <button
                    onClick={() => handleSizeChange(size)}
                    className="ml-2 hover:text-rose-600"
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
                className="w-full border-2 border-black bg-white text-black hover:bg-gray-50 font-bold rounded-none shadow-[2px_2px_0px_rgba(0,0,0,1)]"
              >
                Réinitialiser les filtres
              </Button>
            )}
          </div>

          <div className="mt-4 p-3 bg-amber-50 rounded-none border border-black">
            <p className="text-xs text-gray-600">
              💡 <strong>Conseil :</strong> Utilisez les filtres pour trouver des maîtres avec des chiens compatibles à vos préférences.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
