interface FieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
}

export function Field({ label, value, onChange }: FieldProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
