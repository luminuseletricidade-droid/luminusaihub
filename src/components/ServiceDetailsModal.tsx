import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Clock, Wrench } from 'lucide-react';

interface Service {
  id: string;
  service_name: string;
  description?: string;
  frequency: string;
}

interface ServiceDetailsModalProps {
  services: Service[];
  contractNumber?: string;
  children: React.ReactNode;
}

const getFrequencyLabel = (frequency: string) => {
  const frequencyMap = {
    'diaria': 'Diária',
    'semanal': 'Semanal', 
    'quinzenal': 'Quinzenal',
    'mensal': 'Mensal',
    'bimestral': 'Bimestral',
    'trimestral': 'Trimestral',
    'semestral': 'Semestral',
    'anual': 'Anual'
  };
  return frequencyMap[frequency as keyof typeof frequencyMap] || frequency;
};

const getFrequencyColor = (frequency: string) => {
  const colorMap = {
    'diaria': 'destructive',
    'semanal': 'default',
    'quinzenal': 'default', 
    'mensal': 'secondary',
    'bimestral': 'secondary',
    'trimestral': 'outline',
    'semestral': 'outline',
    'anual': 'outline'
  };
  return colorMap[frequency as keyof typeof colorMap] || 'secondary';
};

export const ServiceDetailsModal = ({ services, contractNumber, children }: ServiceDetailsModalProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            Serviços do Contrato {contractNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {services.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                <Wrench className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum serviço cadastrado para este contrato.</p>
              </CardContent>
            </Card>
          ) : (
            services.map((service, index) => (
              <Card key={service.id} className="transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">#{index + 1}</span>
                      {service.service_name}
                    </CardTitle>
                    <Badge variant={getFrequencyColor(service.frequency) as unknown} className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {getFrequencyLabel(service.frequency)}
                    </Badge>
                  </div>
                </CardHeader>
                
                {service.description && (
                  <>
                    <Separator />
                    <CardContent className="pt-3">
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Descrição:</h4>
                        <p className="text-sm leading-relaxed">{service.description}</p>
                      </div>
                    </CardContent>
                  </>
                )}
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};