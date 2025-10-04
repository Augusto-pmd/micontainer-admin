import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { createOrderServices } from "@/services/order.services";
import { getAllCustomersServices } from "@/services/customer.services";
import { getAvailableStorageRoomsServices } from "@/services/storageRoom.services";
import { showError, showSuccess } from "@/utils/alerts";
import type { Customer } from "@/types/customer";

interface CreateOrderFormData {
  customerId: string;
  storageRoomId: string;
  entryDate: string;
  entryTime: string;
}

export const OrderCreate = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [customers, setCustomers] = useState<ComboboxOption[]>([]);
  const [storageRooms, setStorageRooms] = useState<ComboboxOption[]>([]);
  
  const [formData, setFormData] = useState<CreateOrderFormData>({
    customerId: "",
    storageRoomId: "",
    entryDate: "",
    entryTime: "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CreateOrderFormData, string>>>({});

  useEffect(() => {
    const loadData = async () => {
      setLoadingData(true);
      try {
        // Cargar clientes
        const customersResponse = await getAllCustomersServices({ page: 1, limit: 1000 });
        const customerOptions = customersResponse.data.map((customer: Customer) => ({
          value: customer.id.toString(),
          label: `${customer.user?.firstName || ''} ${customer.user?.lastName || ''} - ${customer.cuit}`,
        }));
        
        // Agregar opción para crear nuevo cliente al inicio
        const customersWithCreateOption = [
          {
            value: "CREATE_NEW",
            label: "➕ Crear nuevo cliente...",
          },
          ...customerOptions,
        ];
        
        setCustomers(customersWithCreateOption);

        // Cargar storage rooms disponibles
        const storageRoomsResponse = await getAvailableStorageRoomsServices(1000);
        const storageRoomOptions = storageRoomsResponse.data.map((room) => {
          const buildingName = room.building?.name || 'Sin edificio';
          const branchName = room.building?.branch?.name || 'Sin sucursal';
          return {
            value: room.id.toString(),
            label: `${branchName} - ${buildingName} - Piso ${room.floor} - Espacio ${room.space} ($${room.price})`,
          };
        });
        setStorageRooms(storageRoomOptions);
      } catch (error) {
        console.error("Error al cargar datos:", error);
        showError("Error al cargar los datos necesarios");
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, []);

  const handleChange = (field: keyof CreateOrderFormData, value: string) => {
    // Si el usuario selecciona "crear nuevo cliente", redirigir
    if (field === "customerId" && value === "CREATE_NEW") {
      navigate("/customers/create", { state: { returnTo: "/orders/create" } });
      return;
    }

    setFormData((prev) => ({ ...prev, [field]: value }));
    // Limpiar error cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CreateOrderFormData, string>> = {};

    if (!formData.customerId) {
      newErrors.customerId = "Debe seleccionar un cliente";
    }

    if (!formData.storageRoomId) {
      newErrors.storageRoomId = "Debe seleccionar un espacio de almacenamiento";
    }

    if (!formData.entryDate) {
      newErrors.entryDate = "La fecha de entrada es requerida";
    } else {
      const selectedDate = new Date(formData.entryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        newErrors.entryDate = "La fecha de entrada no puede ser anterior a hoy";
      }
    }

    if (!formData.entryTime) {
      newErrors.entryTime = "La hora de entrada es requerida";
    } else if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(formData.entryTime)) {
      newErrors.entryTime = "Formato de hora inválido (HH:MM)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showError("Por favor, corrija los errores en el formulario");
      return;
    }

    setIsLoading(true);
    try {
      const orderData = {
        customerId: parseInt(formData.customerId),
        storageRoomId: parseInt(formData.storageRoomId),
        entryDate: formData.entryDate,
        entryTime: formData.entryTime,
      };

      await createOrderServices(orderData);
      showSuccess("Orden creada exitosamente");
      navigate("/orders");
    } catch (error: any) {
      console.error("Error al crear orden:", error);
      const errorMessage = error.response?.data?.message || "Error al crear la orden";
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Obtener la fecha mínima (hoy)
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  if (loadingData) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin" style={{ animationDuration: "0.8s" }}>
          <Spinner className="h-16 w-16 text-green-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => navigate("/orders")}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver a Órdenes
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Crear Nueva Orden de Reserva</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Selección de Cliente */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">
                Información del Cliente
              </h3>

              <div className="space-y-2">
                <Label htmlFor="customerId">
                  Cliente <span className="text-red-500">*</span>
                </Label>
                <Combobox
                  options={customers}
                  value={formData.customerId}
                  onChange={(value) => handleChange("customerId", value)}
                  placeholder="Seleccione un cliente"
                  searchPlaceholder="Buscar cliente..."
                  emptyMessage="No se encontraron clientes"
                  width="w-full"
                  className={errors.customerId ? "border-red-500" : ""}
                />
                {errors.customerId && (
                  <p className="text-sm text-red-500">{errors.customerId}</p>
                )}
              </div>
            </div>

            {/* Selección de Storage Room */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">
                Espacio de Almacenamiento
              </h3>

              <div className="space-y-2">
                <Label htmlFor="storageRoomId">
                  Espacio Disponible <span className="text-red-500">*</span>
                </Label>
                <Combobox
                  options={storageRooms}
                  value={formData.storageRoomId}
                  onChange={(value) => handleChange("storageRoomId", value)}
                  placeholder="Seleccione un espacio"
                  searchPlaceholder="Buscar espacio..."
                  emptyMessage="No hay espacios disponibles"
                  width="w-full"
                  className={errors.storageRoomId ? "border-red-500" : ""}
                />
                {errors.storageRoomId && (
                  <p className="text-sm text-red-500">{errors.storageRoomId}</p>
                )}
                {formData.storageRoomId && (
                  <p className="text-sm text-gray-600 mt-2">
                    💡 Espacio seleccionado: {storageRooms.find(r => r.value === formData.storageRoomId)?.label}
                  </p>
                )}
              </div>
            </div>

            {/* Fecha y Hora de Entrada */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">
                Fecha y Hora de Entrada
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="entryDate">
                    Fecha de Entrada <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="entryDate"
                    type="date"
                    value={formData.entryDate}
                    onChange={(e) => handleChange("entryDate", e.target.value)}
                    min={getTodayDate()}
                    className={errors.entryDate ? "border-red-500" : ""}
                  />
                  {errors.entryDate && (
                    <p className="text-sm text-red-500">{errors.entryDate}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="entryTime">
                    Hora de Entrada <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="entryTime"
                    type="time"
                    value={formData.entryTime}
                    onChange={(e) => handleChange("entryTime", e.target.value)}
                    className={errors.entryTime ? "border-red-500" : ""}
                  />
                  {errors.entryTime && (
                    <p className="text-sm text-red-500">{errors.entryTime}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Información adicional */}
            {customers.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ No hay clientes registrados. Por favor, cree clientes antes de crear una orden.
                </p>
              </div>
            )}

            {storageRooms.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ No hay espacios de almacenamiento disponibles en este momento.
                </p>
              </div>
            )}

            {/* Botones de Acción */}
            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/orders")}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-green-600 hover:bg-green-700"
                disabled={isLoading || customers.length === 0 || storageRooms.length === 0}
              >
                {isLoading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Creando...
                  </>
                ) : (
                  "Crear Orden"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
