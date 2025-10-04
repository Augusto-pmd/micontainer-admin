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
import { useOrderStore } from "@/stores/orderStore";
import { updateOrderServices } from "@/services/order.services";
import { getAllCustomersServices } from "@/services/customer.services";
import { showSuccess, showApiError } from "@/utils/alerts";
import type { Customer } from "@/types/customer";

export const OrderEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedOrder, isLoading, fetchOrderById } = useOrderStore();
  
  const [formData, setFormData] = useState({
    entryDate: "",
    entryTime: "",
    totalAmount: "",
    customerId: 0,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  useEffect(() => {
    if (id) {
      fetchOrderById(Number(id));
    }
  }, [id, fetchOrderById]);

  useEffect(() => {
    const loadCustomers = async () => {
      setLoadingCustomers(true);
      try {
        const response = await getAllCustomersServices({ page: 1, limit: 100 });
        setCustomers(response.data);
      } catch (error) {
        console.error("Error loading customers:", error);
      } finally {
        setLoadingCustomers(false);
      }
    };
    loadCustomers();
  }, []);

  useEffect(() => {
    if (selectedOrder) {
      setFormData({
        entryDate: selectedOrder.entryDate.split("T")[0], // Extract date from ISO string
        entryTime: selectedOrder.entryTime,
        totalAmount: selectedOrder.totalAmount,
        customerId: selectedOrder.customer.id,
      });
    }
  }, [selectedOrder]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCustomerChange = (value: string) => {
    setFormData(prev => ({ ...prev, customerId: Number(value) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.entryDate) {
      showApiError(new Error("La fecha de entrada es requerida"));
      return;
    }

    if (!formData.entryTime) {
      showApiError(new Error("La hora de entrada es requerida"));
      return;
    }

    if (!formData.totalAmount || Number(formData.totalAmount) <= 0) {
      showApiError(new Error("El monto total debe ser mayor a 0"));
      return;
    }

    if (!formData.customerId) {
      showApiError(new Error("Debe seleccionar un cliente"));
      return;
    }

    setIsSaving(true);
    
    try {
      await updateOrderServices(Number(id), formData);
      await showSuccess("Orden actualizada correctamente");
      navigate(`/orders/${id}`);
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

  if (!selectedOrder) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <p className="text-gray-500">Orden no encontrada</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(`/orders/${id}`)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a detalles
        </Button>

        <h1 className="text-3xl font-bold text-gray-900">
          Editar Orden de Reserva
        </h1>
        <p className="text-gray-500 mt-2">
          Actualiza la información de la orden
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información de la Orden */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Información de la Orden
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Fecha de Entrada */}
              <div className="space-y-2">
                <Label htmlFor="entryDate">
                  Fecha de Entrada <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="entryDate"
                  name="entryDate"
                  type="date"
                  value={formData.entryDate}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Hora de Entrada */}
              <div className="space-y-2">
                <Label htmlFor="entryTime">
                  Hora de Entrada <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="entryTime"
                  name="entryTime"
                  type="time"
                  value={formData.entryTime}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Monto Total */}
              <div className="space-y-2">
                <Label htmlFor="totalAmount">
                  Monto Total <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="totalAmount"
                  name="totalAmount"
                  type="number"
                  step="0.01"
                  value={formData.totalAmount}
                  onChange={handleChange}
                  placeholder="0.00"
                  required
                />
              </div>

              {/* Cliente */}
              <div className="space-y-2">
                <Label htmlFor="customerId">
                  Cliente <span className="text-red-500">*</span>
                </Label>
                {loadingCustomers ? (
                  <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-gray-50">
                    <Spinner className="h-4 w-4" />
                    <span className="text-sm text-gray-500">Cargando clientes...</span>
                  </div>
                ) : (
                  <Select
                    value={formData.customerId.toString()}
                    onValueChange={handleCustomerChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.user.firstName} {customer.user.lastName} - {customer.dni}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>

          {/* Información del Espacio de Almacenamiento (Solo lectura) */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Espacio de Almacenamiento
            </h2>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Espacio</p>
                  <p className="text-base text-gray-900">{selectedOrder.storageRoom.space}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Piso</p>
                  <p className="text-base text-gray-900">{selectedOrder.storageRoom.floor}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Dimensiones</p>
                  <p className="text-base text-gray-900">
                    {selectedOrder.storageRoom.width}m × {selectedOrder.storageRoom.length}m × {selectedOrder.storageRoom.height}m
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Precio</p>
                  <p className="text-base text-gray-900">${selectedOrder.storageRoom.price}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Edificio</p>
                  <p className="text-base text-gray-900">{selectedOrder.storageRoom.building.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Sucursal</p>
                  <p className="text-base text-gray-900">{selectedOrder.storageRoom.building.branch.name}</p>
                </div>
              </div>
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  <strong>Nota:</strong> El espacio de almacenamiento no se puede cambiar desde aquí. Para cambiar el espacio, crea una nueva orden.
                </p>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-4 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/orders/${id}`)}
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
