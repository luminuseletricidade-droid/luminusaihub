
import React from 'react';
import { ContractEditFormSimplified } from './ContractEditFormSimplified';

interface ContractEditFormExpandedProps {
  contract: unknown;
  onUpdate: () => void;
}

export const ContractEditFormExpanded = ({ contract, onUpdate }: ContractEditFormExpandedProps) => {
  // Simple wrapper that uses the simplified form
  return (
    <ContractEditFormSimplified 
      contract={contract} 
      onUpdate={onUpdate} 
    />
  );
};
