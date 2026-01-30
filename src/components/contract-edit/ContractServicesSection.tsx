
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContractServiceForm } from '../ContractServiceForm';
import { ContractServicesList } from '../ContractServicesList';

interface ContractServicesSectionProps {
  contractId: string;
}

export const ContractServicesSection = ({ contractId }: ContractServicesSectionProps) => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleServiceAdded = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Serviços de Manutenção</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="list" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list">Serviços Cadastrados</TabsTrigger>
            <TabsTrigger value="add">Adicionar Serviço</TabsTrigger>
          </TabsList>
          
          <TabsContent value="list" className="mt-4">
            <ContractServicesList 
              contractId={contractId} 
              refreshTrigger={refreshTrigger}
            />
          </TabsContent>
          
          <TabsContent value="add" className="mt-4">
            <ContractServiceForm 
              contractId={contractId}
              onServiceAdded={handleServiceAdded}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
