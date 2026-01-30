import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SecureFileUpload } from "@/components/SecureFileUpload";
import { Trash2, Download, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AddressFormWithCep } from '@/components/AddressFormWithCep';

interface Client {
  id: string;
  name: string;
  cnpj?: string;
  email?: string;
  phone?: string;
  address?: string;
  neighborhood?: string;
  number?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  emergency_contact?: string;
  status_id?: string;
  notes?: string;
  contact_person?: string;
  secondary_phone?: string;
  website?: string;
  created_at: string;
  updated_at: string;
}

interface ClientDocument {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size?: number;
  description?: string;
  uploaded_at: string;
}

interface ClientEditDialogProps {
  client: Client;
  onUpdate: (updatedClient: Client) => void;
  children: React.ReactNode;
}

export default function ClientEditDialog({ client, onUpdate, children }: ClientEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Client>(client);
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const { toast } = useToast();


  const loadDocuments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('client_documents')
        .select('*')
        .eq('client_id', client.id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  }, [client.id]);

  useEffect(() => {
    if (open) {
      loadDocuments();
      // Ensure client has user_id for RLS policies
      ensureClientUserIdAsync();
    }
  }, [open, loadDocuments]);

  const ensureClientUserIdAsync = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) return;

      // Check if client has user_id set
      const { data: clientData, error: fetchError } = await supabase
        .from('clients')
        .select('user_id')
        .eq('id', client.id)
        .single();

      if (fetchError) {
        console.error('Error checking client user_id:', fetchError);
        return;
      }

      // If user_id is null, update it
      if (!clientData.user_id) {
        console.log(`Updating client ${client.id} with user_id ${userData.user.id}`);
        const { error: updateError } = await supabase
          .from('clients')
          .update({ user_id: userData.user.id })
          .eq('id', client.id);

        if (updateError) {
          console.error('Error updating client user_id:', updateError);
        } else {
          console.log('Client user_id updated successfully');
        }
      }
    } catch (error) {
      console.error('Error ensuring client user_id:', error);
    }
  };

  const handleInputChange = (field: keyof Client, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Prepare update data without modifying readonly fields
      const updateData = {
        name: formData.name,
        cnpj: formData.cnpj,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        neighborhood: formData.neighborhood,
        number: formData.number,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zip_code,
        emergency_contact: formData.emergency_contact,
        status_id: formData.status_id,
        notes: formData.notes,
        contact_person: formData.contact_person,
        secondary_phone: formData.secondary_phone,
        website: formData.website,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', client.id)
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      onUpdate(data);
      setOpen(false);
      toast({
        title: "Sucesso",
        description: "Cliente atualizado com sucesso",
      });
    } catch (error) {
      console.error('Error updating client:', error);
      toast({
        title: "Erro",
        description: `Erro ao atualizar cliente: ${error.message || 'Erro desconhecido'}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${client.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('client-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('client_documents')
        .insert({
          client_id: client.id,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
        });

      if (dbError) throw dbError;

      loadDocuments();
      toast({
        title: "Sucesso",
        description: "Documento enviado com sucesso",
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar documento",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDocument = async (documentId: string, filePath: string) => {
    try {
      const { error: storageError } = await supabase.storage
        .from('client-documents')
        .remove([filePath]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('client_documents')
        .delete()
        .eq('id', documentId);

      if (dbError) throw dbError;

      loadDocuments();
      toast({
        title: "Sucesso",
        description: "Documento removido com sucesso",
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover documento",
        variant: "destructive",
      });
    }
  };

  const downloadDocument = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('client-documents')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: "Erro",
        description: "Erro ao baixar documento",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Cliente: {client.name}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Empresa</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={formData.cnpj || ''}
                  onChange={(e) => handleInputChange('cnpj', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone Principal</Label>
                <Input
                  id="phone"
                  value={formData.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondary_phone">Telefone Secundário</Label>
                <Input
                  id="secondary_phone"
                  value={formData.secondary_phone || ''}
                  onChange={(e) => handleInputChange('secondary_phone', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_person">Pessoa de Contato</Label>
                <Input
                  id="contact_person"
                  value={formData.contact_person || ''}
                  onChange={(e) => handleInputChange('contact_person', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={formData.website || ''}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergency_contact">Contato de Emergência</Label>
                <Input
                  id="emergency_contact"
                  value={formData.emergency_contact || ''}
                  onChange={(e) => handleInputChange('emergency_contact', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <AddressFormWithCep
                cep={formData.zip_code || ''}
                address={formData.address || ''}
                neighborhood={formData.neighborhood || ''}
                number={formData.number || ''}
                city={formData.city || ''}
                state={formData.state || ''}
                onCepChange={(value) => handleInputChange('zip_code', value)}
                onAddressChange={(value) => handleInputChange('address', value)}
                onNeighborhoodChange={(value) => handleInputChange('neighborhood', value)}
                onNumberChange={(value) => handleInputChange('number', value)}
                onCityChange={(value) => handleInputChange('city', value)}
                onStateChange={(value) => handleInputChange('state', value)}
                showLabels={true}
                required={false}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => handleInputChange('notes', e.target.value)}
              />
            </div>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Enviar Documento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SecureFileUpload 
                  onFileUpload={handleFileUpload}
                  allowedTypes={['*']}
                  accept="*"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Documentos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{doc.file_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {doc.file_size && `${(doc.file_size / 1024 / 1024).toFixed(2)} MB`} •
                          Enviado em {new Date(doc.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadDocument(doc.file_path, doc.file_name)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteDocument(doc.id, doc.file_path)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {documents.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">
                      Nenhum documento enviado
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}