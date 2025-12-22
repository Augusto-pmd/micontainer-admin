import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { usePricingEngineStore } from '@/stores/pricingEngineStore';
import { showDeleteConfirm, showSuccess, showApiError } from '@/utils/alerts';

export default function PricingEngineDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    currentPricingEngine,
    fetchPricingEngineById,
    deletePricingEngine,
    loading,
  } = usePricingEngineStore();

  useEffect(() => {
    if (id) {
      fetchPricingEngineById(parseInt(id));
    }
  }, [id, fetchPricingEngineById]);

  const handleDelete = async () => {
    if (!id) return;

    const confirmed = await showDeleteConfirm(
      '¿Estás seguro de eliminar este pricing engine?'
    );
    if (confirmed) {
      try {
        await deletePricingEngine(parseInt(id));
        await showSuccess('Pricing Engine eliminado correctamente');
        navigate('/pricing-engine');
      } catch (error: any) {
        showApiError(error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="h-12 w-12" />
      </div>
    );
  }

  if (!currentPricingEngine) {
    return (
      <div className="container mx-auto p-6">
        <p>No se encontró el pricing engine</p>
      </div>
    );
  }

  const occupancyPercentage = (
    (currentPricingEngine.occupiedUnits / currentPricingEngine.totalUnits) *
    100
  ).toFixed(1);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/pricing-engine')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Pricing Engines
        </Button>

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Pricing Engine #{currentPricingEngine.id}
            </h1>
            <p className="text-gray-500 mt-2">
              Detalles del motor de precios
            </p>
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              onClick={() => navigate(`/pricing-engine/edit/${id}`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Información General */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Información General</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">ID</p>
              <p className="font-medium">{currentPricingEngine.id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Sucursal</p>
              <p className="font-medium">
                {currentPricingEngine.branch?.name || `ID: ${currentPricingEngine.branchId}`}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Precio Base por m²</p>
              <p className="font-medium text-lg">${currentPricingEngine.basePricePerM2}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Factor de Escasez</p>
              <p className="font-medium">{currentPricingEngine.scarcityFactor.toFixed(2)}x</p>
            </div>
          </div>
        </Card>

        {/* Estadísticas de Ocupación */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Ocupación</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Total de Unidades</p>
              <p className="font-medium text-2xl">{currentPricingEngine.totalUnits}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Unidades Ocupadas</p>
              <p className="font-medium text-2xl">{currentPricingEngine.occupiedUnits}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Porcentaje de Ocupación</p>
              <p className="font-medium text-2xl">{occupancyPercentage}%</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 mt-2">
              <div
                className="bg-blue-600 h-4 rounded-full transition-all"
                style={{ width: `${occupancyPercentage}%` }}
              />
            </div>
          </div>
        </Card>

        {/* Configuración Adicional */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Configuración</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Base Scarcity Multiplier</p>
              <p className="font-medium">{currentPricingEngine.baseScarcityMultiplier}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Duración Esperada</p>
              <p className="font-medium">
                {currentPricingEngine.expectedDurationMonths} meses
              </p>
            </div>
          </div>
        </Card>

        {/* Fechas */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Fechas</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Fecha de Creación</p>
              <p className="font-medium">
                {new Date(currentPricingEngine.createdAt).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Última Actualización</p>
              <p className="font-medium">
                {new Date(currentPricingEngine.updatedAt).toLocaleString()}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Fórmula de Cálculo */}
      <Card className="p-6 mt-6">
        <h2 className="text-xl font-semibold mb-4">Fórmula de Cálculo de Precio</h2>
        <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm">
          <p className="mb-2">
            <strong>precioFinal =</strong> basePricePerM2 × scarcityFactor × floorMultiplier ×
            sizeMultiplier × areaM2
          </p>
          <p className="text-gray-600">
            <strong>Ejemplo:</strong> ${currentPricingEngine.basePricePerM2} ×{' '}
            {currentPricingEngine.scarcityFactor.toFixed(2)} × 1.2 × 1.15 × 15m² = $
            {(
              currentPricingEngine.basePricePerM2 *
              currentPricingEngine.scarcityFactor *
              1.2 *
              1.15 *
              15
            ).toFixed(2)}
          </p>
        </div>
      </Card>
    </div>
  );
}
