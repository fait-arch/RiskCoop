import { SearchBox } from "@/components/atoms/SearchBox";
import { SelectFilter } from "@/components/atoms/SelectFilter";
import { riskFilters, maxDaysOptions } from "@/lib/constants";

interface TableControlsProps {
  search: string;
  onSearchChange: (v: string) => void;
  riskFilter: string;
  onRiskFilterChange: (v: string) => void;
  destinationFilter: string;
  onDestinationFilterChange: (v: string) => void;
  destinations: string[];
  maxDaysFilter: string;
  onMaxDaysFilterChange: (v: string) => void;
}

export function TableControls({
  search, onSearchChange,
  riskFilter, onRiskFilterChange,
  destinationFilter, onDestinationFilterChange, destinations,
  maxDaysFilter, onMaxDaysFilterChange
}: TableControlsProps) {
  return (
    <div className="tableControls">
      <SearchBox value={search} onChange={onSearchChange} placeholder="Buscar socio, operacion o destino" />
      <SelectFilter value={riskFilter} onChange={onRiskFilterChange} label="Filtrar por riesgo" showIcon>
        {riskFilters.map((r) => <option key={r} value={r}>{r}</option>)}
      </SelectFilter>
      <SelectFilter value={destinationFilter} onChange={onDestinationFilterChange} label="Filtrar por destino de operacion">
        {destinations.map((d) => <option key={d} value={d}>{d}</option>)}
      </SelectFilter>
      <SelectFilter value={maxDaysFilter} onChange={onMaxDaysFilterChange} label="Filtrar por dias hasta pago">
        {maxDaysOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </SelectFilter>
    </div>
  );
}
