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

export interface MapFilterOptions {
  breed?: string;
  size?: string;
  showPlaces: boolean;
  placeTypes: string[];
  showVets: boolean;
  showDangers: boolean;
  showWalkers: boolean;
}

interface WalkingMapFiltersProps {
  onFilterChange: (filters: MapFilterOptions) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const PLACE_TYPES = [
  { id: 'park', label: '🌳 Parcs' },
  { id: 'beach', label: '🏖️ Plages' },
  { id: 'restaurant', label: '🍴 Restos & Bars' },
  { id: 'hotel', label: '🏨 Hôtels' },
  { id: 'other', label: '📍 Autres' },
];

export default function WalkingMapFilters({
  onFilterChange,
  isOpen,
  onToggle,
}: WalkingMapFiltersProps) {
  const [breed, setBreed] = useState<string>('');
  const [size, setSize] = useState<string>('');
  const [showPlaces, setShowPlaces] = useState<boolean>(true);
  const [placeTypes, setPlaceTypes] = useState<string[]>(['park', 'beach', 'restaurant', 'hotel', 'other']);
  const [showVets, setShowVets] = useState<boolean>(true);
  const [showDangers, setShowDangers] = useState<boolean>(true);
  const [showWalkers, setShowWalkers] = useState<boolean>(true);

  const updateFilters = (next: Partial<MapFilterOptions>) => {
    const updated: MapFilterOptions = {
      breed: next.breed !== undefined ? next.breed : breed,
      size: next.size !== undefined ? next.size : size,
      showPlaces: next.showPlaces !== undefined ? next.showPlaces : showPlaces,
      placeTypes: next.placeTypes !== undefined ? next.placeTypes : placeTypes,
      showVets: next.showVets !== undefined ? next.showVets : showVets,
      showDangers: next.showDangers !== undefined ? next.showDangers : showDangers,
      showWalkers: next.showWalkers !== undefined ? next.showWalkers : showWalkers,
    };
    onFilterChange(updated);
  };

  const handleBreedChange = (value: string) => {
    const newBreed = value === breed ? '' : value;
    setBreed(newBreed);
    updateFilters({ breed: newBreed || undefined });
  };

  const handleSizeChange = (value: string) => {
    const newSize = value === size ? '' : value;
    setSize(newSize);
    updateFilters({ size: newSize || undefined });
  };

  const togglePlaceType = (typeId: string) => {
    let next: string[];
    if (placeTypes.includes(typeId)) {
      next = placeTypes.filter(t => t !== typeId);
    } else {
      next = [...placeTypes, typeId];
    }
    setPlaceTypes(next);
    updateFilters({ placeTypes: next });
  };

  const handleReset = () => {
    setBreed('');
    setSize('');
    setShowPlaces(true);
    setPlaceTypes(['park', 'beach', 'restaurant', 'hotel', 'other']);
    setShowVets(true);
    setShowDangers(true);
    setShowWalkers(true);
    onFilterChange({
      breed: undefined,
      size: undefined,
      showPlaces: true,
      placeTypes: ['park', 'beach', 'restaurant', 'hotel', 'other'],
      showVets: true,
      showDangers: true,
      showWalkers: true,
    });
  };

  return (
    <div className="absolute top-4 left-4 z-10">
      <Button
        onClick={onToggle}
        className="bg-[#FFFDF9] text-black hover:bg-gray-50 border-2 border-black font-black shadow-[3px_3px_0px_rgba(0,0,0,1)] uppercase text-xs rounded-none mb-2"
      >
        {isOpen ? '✕ Fermer' : '⚙️ Filtres Carte'}
      </Button>

      {isOpen && (
        <Card className="w-80 p-5 border-2 border-black bg-[#FFFDF9] shadow-[6px_6px_0px_rgba(0,0,0,1)] rounded-none max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-3 border-b-2 border-black pb-2">
            <h3 className="text-sm font-black uppercase text-black">Affichage Carte & Filtres</h3>
            <button onClick={onToggle} className="text-gray-500 hover:text-black">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-4">
            {/* Layers visibility section */}
            <div>
              <label className="block text-xs font-black uppercase mb-2 text-black">
                Éléments sur la carte
              </label>
              
              <div className="space-y-2 text-xs">
                {/* Dog-Friendly Places main toggle */}
                <div className="p-2 border-2 border-black bg-white">
                  <label className="flex items-center justify-between font-bold cursor-pointer">
                    <span className="flex items-center gap-1.5">🌳 Lieux Dog-Friendly</span>
                    <input
                      type="checkbox"
                      checked={showPlaces}
                      onChange={(e) => {
                        setShowPlaces(e.target.checked);
                        updateFilters({ showPlaces: e.target.checked });
                      }}
                      className="w-4 h-4 accent-pink-500 cursor-pointer"
                    />
                  </label>

                  {/* Sub-types checkboxes */}
                  {showPlaces && (
                    <div className="mt-2.5 pt-2 border-t border-gray-200 grid grid-cols-2 gap-1.5 pl-1">
                      {PLACE_TYPES.map((type) => (
                        <label
                          key={type.id}
                          className={`flex items-center gap-1.5 px-2 py-1 border border-black cursor-pointer text-[11px] font-bold ${
                            placeTypes.includes(type.id) ? 'bg-pink-100' : 'bg-gray-50 text-gray-400'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={placeTypes.includes(type.id)}
                            onChange={() => togglePlaceType(type.id)}
                            className="w-3.5 h-3.5 accent-pink-600"
                          />
                          <span>{type.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Vets toggle */}
                <label className="flex items-center justify-between p-2 border-2 border-black bg-white font-bold cursor-pointer">
                  <span className="flex items-center gap-1.5">🏥 Vétérinaires</span>
                  <input
                    type="checkbox"
                    checked={showVets}
                    onChange={(e) => {
                      setShowVets(e.target.checked);
                      updateFilters({ showVets: e.target.checked });
                    }}
                    className="w-4 h-4 accent-emerald-600 cursor-pointer"
                  />
                </label>

                {/* Dangers toggle */}
                <label className="flex items-center justify-between p-2 border-2 border-black bg-white font-bold cursor-pointer">
                  <span className="flex items-center gap-1.5">⚠️ Zones de Danger</span>
                  <input
                    type="checkbox"
                    checked={showDangers}
                    onChange={(e) => {
                      setShowDangers(e.target.checked);
                      updateFilters({ showDangers: e.target.checked });
                    }}
                    className="w-4 h-4 accent-rose-600 cursor-pointer"
                  />
                </label>

                {/* Walkers toggle */}
                <label className="flex items-center justify-between p-2 border-2 border-black bg-white font-bold cursor-pointer">
                  <span className="flex items-center gap-1.5">🐕 Promeneurs Actifs</span>
                  <input
                    type="checkbox"
                    checked={showWalkers}
                    onChange={(e) => {
                      setShowWalkers(e.target.checked);
                      updateFilters({ showWalkers: e.target.checked });
                    }}
                    className="w-4 h-4 accent-purple-600 cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* Breed Filter */}
            {showWalkers && (
              <div className="pt-2 border-t border-gray-200">
                <label className="block text-xs font-black uppercase mb-1 text-black">
                  Race du chien (Promeneurs)
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
            )}

            {/* Size Filter */}
            {showWalkers && (
              <div>
                <label className="block text-xs font-black uppercase mb-1 text-black">
                  Taille du chien (Promeneurs)
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
            )}

            {/* Reset Button */}
            <Button
              onClick={handleReset}
              variant="outline"
              className="w-full border-2 border-black bg-white text-black hover:bg-gray-50 font-bold rounded-none shadow-[2px_2px_0px_rgba(0,0,0,1)] text-xs uppercase"
            >
              Réinitialiser les filtres
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
