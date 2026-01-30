
import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ModernContractChat } from './ModernContractChat';
import { ExtendedContract } from '@/types';

interface ContractChatProps {
  contract: ExtendedContract;
  onBack: () => void;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
}

const ContractChat = ({ contract, onBack, isMaximized = false, onToggleMaximize }: ContractChatProps) => {
  if (isMaximized && onToggleMaximize) {
    return (
      <Dialog open={true} onOpenChange={onToggleMaximize}>
        <DialogContent className="max-w-7xl max-h-[95vh] p-0">
          <DialogTitle className="sr-only">Chat IA - {contract.contract_number}</DialogTitle>
          <DialogDescription className="sr-only">
            Chat de inteligência artificial para análise do contrato {contract.contract_number}
          </DialogDescription>
          <div className="h-[90vh]">
            <ModernContractChat 
              contract={contract}
              onBack={onBack}
              onToggleMaximize={onToggleMaximize}
              isMaximized={true}
            />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <ModernContractChat 
        contract={contract}
        onBack={onBack}
        onToggleMaximize={onToggleMaximize}
        isMaximized={false}
      />
    </div>
  );
};

export default ContractChat;
