import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Search,
  ArrowLeft,
  Loader2,
  Palette,
} from "lucide-react";
import { toast } from "sonner";

interface Region {
  id: string;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface RegionFormData {
  name: string;
  description: string;
  color: string;
  is_active: boolean;
}

const defaultFormData: RegionFormData = {
  name: "",
  description: "",
  color: "#6366f1",
  is_active: true,
};

const colorPresets = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#6b7280", // gray
];

export default function Regions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [formData, setFormData] = useState<RegionFormData>(defaultFormData);

  // Fetch regions
  const fetchRegions = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<Region[]>("/api/regions");
      setRegions(data || []);
    } catch (error) {
      console.error("Error fetching regions:", error);
      toast.error("Erro ao carregar regiões");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegions();
  }, []);

  // Filter regions by search term
  const filteredRegions = regions.filter(
    (region) =>
      region.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      region.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Open dialog for new region
  const handleNewRegion = () => {
    setSelectedRegion(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  // Open dialog for editing
  const handleEditRegion = (region: Region) => {
    setSelectedRegion(region);
    setFormData({
      name: region.name,
      description: region.description || "",
      color: region.color || "#6366f1",
      is_active: region.is_active,
    });
    setIsDialogOpen(true);
  };

  // Open delete confirmation
  const handleDeleteClick = (region: Region) => {
    setSelectedRegion(region);
    setIsDeleteDialogOpen(true);
  };

  // Save region (create or update)
  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Nome da região é obrigatório");
      return;
    }

    try {
      setSaving(true);

      if (selectedRegion) {
        // Update
        await apiFetch(`/api/regions/${selectedRegion.id}`, {
          method: "PUT",
          body: JSON.stringify(formData),
        });
        toast.success("Região atualizada com sucesso");
      } else {
        // Create
        await apiFetch("/api/regions", {
          method: "POST",
          body: JSON.stringify(formData),
        });
        toast.success("Região criada com sucesso");
      }

      setIsDialogOpen(false);
      fetchRegions();
    } catch (error) {
      console.error("Error saving region:", error);
      toast.error("Erro ao salvar região");
    } finally {
      setSaving(false);
    }
  };

  // Delete region
  const handleDelete = async () => {
    if (!selectedRegion) return;

    try {
      await apiFetch(`/api/regions/${selectedRegion.id}`, {
        method: "DELETE",
      });
      toast.success("Região excluída com sucesso");
      setIsDeleteDialogOpen(false);
      fetchRegions();
    } catch (error) {
      console.error("Error deleting region:", error);
      toast.error("Erro ao excluir região");
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/app/dashboard")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MapPin className="h-6 w-6" />
              Cadastro de Regiões
            </h1>
            <p className="text-muted-foreground">
              Gerencie as regiões para organizar clientes e manutenções
            </p>
          </div>
        </div>
        <Button onClick={handleNewRegion}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Região
        </Button>
      </div>

      {/* Search and Stats */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Regiões Cadastradas</CardTitle>
              <CardDescription>
                {regions.length} região(ões) no total
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar região..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredRegions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchTerm ? (
                <p>Nenhuma região encontrada para "{searchTerm}"</p>
              ) : (
                <div className="space-y-2">
                  <MapPin className="h-12 w-12 mx-auto opacity-50" />
                  <p>Nenhuma região cadastrada</p>
                  <Button variant="outline" size="sm" onClick={handleNewRegion}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar primeira região
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Cor</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-24 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRegions.map((region) => (
                  <TableRow key={region.id}>
                    <TableCell>
                      <div
                        className="w-6 h-6 rounded-full border"
                        style={{ backgroundColor: region.color || "#6366f1" }}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{region.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {region.description || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={region.is_active ? "default" : "secondary"}
                      >
                        {region.is_active ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditRegion(region)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(region)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {selectedRegion ? "Editar Região" : "Nova Região"}
            </DialogTitle>
            <DialogDescription>
              {selectedRegion
                ? "Atualize os dados da região"
                : "Preencha os dados para criar uma nova região"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                placeholder="Ex: Zona Norte, Centro, Litoral..."
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Descrição opcional da região..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Cor de Identificação
              </Label>
              <div className="flex items-center gap-2">
                <div className="flex gap-1 flex-wrap">
                  {colorPresets.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-7 h-7 rounded-full border-2 transition-all ${
                        formData.color === color
                          ? "border-foreground scale-110"
                          : "border-transparent hover:border-muted-foreground"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({ ...formData, color })}
                    />
                  ))}
                </div>
                <Input
                  type="color"
                  value={formData.color}
                  onChange={(e) =>
                    setFormData({ ...formData, color: e.target.value })
                  }
                  className="w-10 h-8 p-0 border-0 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Região Ativa</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {selectedRegion ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Região</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a região "{selectedRegion?.name}"?
              <br />
              <br />
              <strong>Atenção:</strong> Clientes e manutenções vinculados a esta
              região terão o campo de região removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
