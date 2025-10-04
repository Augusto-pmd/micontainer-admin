import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCustomerStore } from "@/stores/customerStore";
import { updateCustomerServices } from "@/services/customer.services";
import { showSuccess, showApiError } from "@/utils/alerts";

export const CustomerEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedCustomer, isLoading, fetchCustomerById } = useCustomerStore();
  
  const [formData, setFormData] = useState({
    dni: "",
    cuit: "",
    address: "",
    phone: "",
    personType: "fisica" as "fisica" | "juridica",
    user: {
      firstName: "",
      lastName: "",
      email: "",
    }
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCustomerById(Number(id));
    }
  }, [id, fetchCustomerById]);

  useEffect(() => {
    if (selectedCustomer) {
      setFormData({
        dni: selectedCustomer.dni,
        cuit: selectedCustomer.cuit,
        address: selectedCustomer.address,
        phone: selectedCustomer.phone,
        personType: selectedCustomer.personType,
        user: {
          firstName: selectedCustomer.user.firstName,
          lastName: selectedCustomer.user.lastName,
          email: selectedCustomer.user.email,
        }
      });
    }
  }, [selectedCustomer]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith("user.")) {
      const userField = name.split(".")[1];
      setFormData(prev => ({
        ...prev,
        user: {
          ...prev.user,
          [userField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handlePersonTypeChange = (value: "fisica" | "juridica") => {
    setFormData(prev => ({ ...prev, personType: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.dni.trim()) {
      showApiError(new Error("El DNI es requerido"));
      return;
    }

    if (!formData.cuit.trim()) {
      showApiError(new Error("El CUIT es requerido"));
      return;
    }

    if (!formData.user.firstName.trim()) {
      showApiError(new Error("El nombre es requerido"));
      return;
    }

    if (!formData.user.lastName.trim()) {
      showApiError(new Error("El apellido es requerido"));
      return;
    }

    if (!formData.user.email.trim()) {
      showApiError(new Error("El email es requerido"));
      return;
    }

    setIsSaving(true);
    
    try {
      await updateCustomerServices(Number(id), formData);
      await showSuccess("Cliente actualizado correctamente");
      navigate(`/customers/${id}`);
    } catch (error: any) {
      showApiError(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin" style={{ animationDuration: "0.8s" }}>
          <Spinner className="h-16 w-16 text-green-500" />
        </div>
      </div>
    );
  }

  if (!selectedCustomer) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <p className="text-gray-500">Cliente no encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(`/customers/${id}`)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a detalles
        </Button>

        <h1 className="text-3xl font-bold text-gray-900">
          Editar Cliente
        </h1>
        <p className="text-gray-500 mt-2">
          Actualiza la información del cliente
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información del Usuario */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Información Personal
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nombre */}
              <div className="space-y-2">
                <Label htmlFor="user.firstName">
                  Nombre <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="user.firstName"
                  name="user.firstName"
                  value={formData.user.firstName}
                  onChange={handleChange}
                  placeholder="Nombre"
                  required
                />
              </div>

              {/* Apellido */}
              <div className="space-y-2">
                <Label htmlFor="user.lastName">
                  Apellido <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="user.lastName"
                  name="user.lastName"
                  value={formData.user.lastName}
                  onChange={handleChange}
                  placeholder="Apellido"
                  required
                />
              </div>

              {/* Email */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="user.email">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="user.email"
                  name="user.email"
                  type="email"
                  value={formData.user.email}
                  onChange={handleChange}
                  placeholder="Email"
                  required
                />
              </div>
            </div>
          </div>

          {/* Información del Cliente */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Información del Cliente
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* DNI */}
              <div className="space-y-2">
                <Label htmlFor="dni">
                  DNI <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="dni"
                  name="dni"
                  value={formData.dni}
                  onChange={handleChange}
                  placeholder="DNI"
                  required
                />
              </div>

              {/* CUIT */}
              <div className="space-y-2">
                <Label htmlFor="cuit">
                  CUIT <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cuit"
                  name="cuit"
                  value={formData.cuit}
                  onChange={handleChange}
                  placeholder="CUIT"
                  required
                />
              </div>

              {/* Dirección */}
              <div className="space-y-2">
                <Label htmlFor="address">
                  Dirección <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Dirección"
                  required
                />
              </div>

              {/* Teléfono */}
              <div className="space-y-2">
                <Label htmlFor="phone">
                  Teléfono <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Teléfono"
                  required
                />
              </div>

              {/* Tipo de Persona */}
              <div className="space-y-2">
                <Label htmlFor="personType">
                  Tipo de Persona <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.personType}
                  onValueChange={handlePersonTypeChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fisica">Persona Física</SelectItem>
                    <SelectItem value="juridica">Persona Jurídica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-4 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/customers/${id}`)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSaving ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
