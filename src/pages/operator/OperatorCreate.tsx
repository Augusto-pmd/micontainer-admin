import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { createOperatorServices } from "@/services/operator.services";
import { getAllBranchesServices } from "@/services/branch.services";
import { showError, showSuccess } from "@/utils/alerts";
import type { Branch } from "@/types/branch";

interface OperatorForm {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  branchId: string;
}

export const OperatorCreate = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [formData, setFormData] = useState<OperatorForm>({
    email: "",
    firstName: "",
    lastName: "",
    role: "role-operator",
    branchId: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof OperatorForm, string>>>({});

  useEffect(() => {
    getAllBranchesServices({ page: 1, limit: 100 })
      .then(r => setBranches(r.data))
      .catch(() => showError("Error al cargar sucursales"))
      .finally(() => setLoadingBranches(false));
    setLoadingBranches(true);
  }, []);

  const set = (field: keyof OperatorForm, value: string) => {
    setFormData(p => ({ ...p, [field]: value }));
    setErrors(p => ({ ...p, [field]: undefined }));
  };

  const validate = () => {
    const e: Partial<Record<keyof OperatorForm, string>> = {};
    if (!formData.firstName.trim()) e.firstName = "Requerido";
    if (!formData.lastName.trim())  e.lastName  = "Requerido";
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      e.email = "Email inválido";
    if (!formData.role)     e.role     = "Requerido";
    if (!formData.branchId) e.branchId = "Requerido";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    try {
      await createOperatorServices(formData as any);
      showSuccess("Operador registrado. Podrá ingresar con Google usando ese email.");
      navigate("/operators");
    } catch (err: any) {
      showError(err.response?.data?.message || "Error al crear el operador");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <Button variant="ghost" onClick={() => navigate("/operators")} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Volver
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Agregar operador</CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            El operador ingresará con su cuenta Google (<code>@micontainer.com</code>). No necesita contraseña.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
              <Input id="email" type="email" value={formData.email}
                onChange={e => set("email", e.target.value)}
                placeholder="am@micontainer.com"
                className={errors.email ? "border-red-500" : ""} />
              {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
            </div>

            {/* Nombre y Apellido */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nombre <span className="text-red-500">*</span></Label>
                <Input id="firstName" value={formData.firstName}
                  onChange={e => set("firstName", e.target.value)}
                  placeholder="Augusto"
                  className={errors.firstName ? "border-red-500" : ""} />
                {errors.firstName && <p className="text-xs text-red-500">{errors.firstName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Apellido <span className="text-red-500">*</span></Label>
                <Input id="lastName" value={formData.lastName}
                  onChange={e => set("lastName", e.target.value)}
                  placeholder="Menéndez"
                  className={errors.lastName ? "border-red-500" : ""} />
                {errors.lastName && <p className="text-xs text-red-500">{errors.lastName}</p>}
              </div>
            </div>

            {/* Rol */}
            <div className="space-y-2">
              <Label>Rol <span className="text-red-500">*</span></Label>
              <Select value={formData.role} onValueChange={v => set("role", v)}>
                <SelectTrigger className={errors.role ? "border-red-500" : ""}>
                  <SelectValue placeholder="Seleccioná un rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="role-admin">Administrador — acceso total</SelectItem>
                  <SelectItem value="role-operator">Operador — gestión del día a día</SelectItem>
                </SelectContent>
              </Select>
              {errors.role && <p className="text-xs text-red-500">{errors.role}</p>}
            </div>

            {/* Sucursal */}
            <div className="space-y-2">
              <Label>Sucursal <span className="text-red-500">*</span></Label>
              {loadingBranches ? (
                <div className="flex items-center gap-2 p-2 text-sm text-gray-500">
                  <Spinner className="h-4 w-4" /> Cargando...
                </div>
              ) : (
                <Select value={formData.branchId} onValueChange={v => set("branchId", v)}>
                  <SelectTrigger className={errors.branchId ? "border-red-500" : ""}>
                    <SelectValue placeholder="Seleccioná una sucursal" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map(b => (
                      <SelectItem key={b.id} value={b.id!.toString()}>
                        {b.name}{b.city ? ` — ${b.city}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {errors.branchId && <p className="text-xs text-red-500">{errors.branchId}</p>}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate("/operators")} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={isLoading || loadingBranches}>
                {isLoading ? <><Spinner className="mr-2 h-4 w-4" /> Guardando...</> : "Agregar operador"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
