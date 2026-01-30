import { useState } from 'react';
import { ChevronDown, ChevronRight, Folder, FolderOpen, Building2, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import ContractCard from './ContractCard';
import { ExtendedContract } from '@/types';

interface ClientFolderProps {
  clientName: string;
  contracts: ExtendedContract[];
  onContractSelect: (contract: ExtendedContract) => void;
  getContractAlerts: (contract: ExtendedContract) => string[];
  onStatusChange: (contractId: string, newStatus: string, newType: string) => void;
  onArchiveContract?: (contractId: string) => void;
  onDeleteContract?: (contractId: string) => void;
  onOpenChat?: (contract: ExtendedContract) => void;
}

const ClientFolder = ({ 
  clientName, 
  contracts, 
  onContractSelect,
  getContractAlerts,
  onStatusChange,
  onArchiveContract,
  onDeleteContract,
  onOpenChat
}: ClientFolderProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const activeContracts = contracts.filter(c => c.status === 'active').length;
  const totalValue = contracts.reduce((sum, c) => sum + (c.value || c.contract_value || 0), 0);
  const expiringContracts = contracts.filter(c => {
    if (!c.end_date) return false;
    const today = new Date();
    const endDate = new Date(c.end_date);
    const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  }).length;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <Card className="border-border">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardContent className="p-4 cursor-pointer hover:bg-accent/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  {isOpen ? (
                    <FolderOpen className="h-5 w-5 text-primary" />
                  ) : (
                    <Folder className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold flex items-center">
                    <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                    {clientName}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {contracts.length} contrato{contracts.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="flex items-center space-x-3 text-sm">
                    <div className="flex items-center space-x-1">
                      <FileText className="h-3 w-3 text-green-500" />
                      <span className="text-muted-foreground">Ativos:</span>
                      <Badge variant="secondary" className="text-xs">
                        {activeContracts}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <span className="text-muted-foreground">Valor Total:</span>
                      <span className="font-medium text-primary">
                        {formatCurrency(totalValue)}
                      </span>
                    </div>
                    
                    {expiringContracts > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {expiringContracts} expirando
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="border-t border-border">
            <div className="p-4 space-y-3 bg-accent/20">
              {contracts.map((contract) => (
                <ContractCard
                  key={contract.id}
                  contract={contract}
                  onSelect={onContractSelect}
                  getContractAlerts={getContractAlerts}
                  onStatusChange={onStatusChange}
                  onArchiveContract={onArchiveContract}
                  onDeleteContract={onDeleteContract}
                  onOpenChat={onOpenChat}
                />
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default ClientFolder;