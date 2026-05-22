import { ReactNode } from "react";

interface PrimaryButtonProps {
  onClick: () => void;
  disabled?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

export function PrimaryButton({ onClick, disabled, icon, children }: PrimaryButtonProps) {
  return (
    <button className="primaryButton" onClick={onClick} disabled={disabled}>
      {icon}
      {children}
    </button>
  );
}
