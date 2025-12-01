import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export interface Filters {
  cities: string[];
  types: string[];
  hasPhoto: boolean | null;
  has3DModel: boolean | null;
}

interface FilterPanelProps {
  onFilterChange: (filters: Filters) => void;
  onClose?: () => void;
}

const FilterPanel = ({ onFilterChange, onClose }: FilterPanelProps) => {
  const [filters, setFilters] = useState<Filters>({
    cities: [],
    types: [],
    hasPhoto: null,
    has3DModel: null,
  });

  const cities = ["Nijmegen", "Utrecht", "Alkmaar", "Den Haag", "Delft", "Dublin", "Antoing"];
  const types = ["Sculptuur", "Muurschildering", "Monument", "Fontein", "Street Art"];

  const toggleCity = (city: string) => {
    const newCities = filters.cities.includes(city)
      ? filters.cities.filter(c => c !== city)
      : [...filters.cities, city];
    
    const newFilters = { ...filters, cities: newCities };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const toggleType = (type: string) => {
    const newTypes = filters.types.includes(type)
      ? filters.types.filter(t => t !== type)
      : [...filters.types, type];
    
    const newFilters = { ...filters, types: newTypes };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const togglePhotoFilter = () => {
    const newFilters = {
      ...filters,
      hasPhoto: filters.hasPhoto === null ? true : filters.hasPhoto ? false : null
    };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const toggle3DFilter = () => {
    const newFilters = {
      ...filters,
      has3DModel: filters.has3DModel === null ? true : filters.has3DModel ? false : null
    };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const emptyFilters: Filters = {
      cities: [],
      types: [],
      hasPhoto: null,
      has3DModel: null,
    };
    setFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Filters</CardTitle>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Reset
          </Button>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-medium mb-2">Steden</h3>
          <div className="space-y-2">
            {cities.map((city) => (
              <div key={city} className="flex items-center space-x-2">
                <Checkbox
                  id={`city-${city}`}
                  checked={filters.cities.includes(city)}
                  onCheckedChange={() => toggleCity(city)}
                />
                <Label htmlFor={`city-${city}`} className="cursor-pointer">
                  {city}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="font-medium mb-2">Type Kunstwerk</h3>
          <div className="space-y-2">
            {types.map((type) => (
              <div key={type} className="flex items-center space-x-2">
                <Checkbox
                  id={`type-${type}`}
                  checked={filters.types.includes(type)}
                  onCheckedChange={() => toggleType(type)}
                />
                <Label htmlFor={`type-${type}`} className="cursor-pointer">
                  {type}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="font-medium mb-2">Media</h3>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="has-photo"
                checked={filters.hasPhoto === true}
                onCheckedChange={togglePhotoFilter}
              />
              <Label htmlFor="has-photo" className="cursor-pointer">
                Met foto
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="has-3d"
                checked={filters.has3DModel === true}
                onCheckedChange={toggle3DFilter}
              />
              <Label htmlFor="has-3d" className="cursor-pointer">
                Met 3D model
              </Label>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FilterPanel;
