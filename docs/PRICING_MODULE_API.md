# Pricing Module API Documentation

Documentación de los endpoints del módulo de precios (Pricing Engine, Floor Multipliers y Size Permissions).

---

## 🔐 Autenticación

Todos los endpoints requieren autenticación. Incluir el token JWT en el header:

```
Authorization: Bearer <your-jwt-token>
```

---

## 📊 Pricing Engine

### GET `/api/pricing-engine`
Obtener todos los pricing engines.

**Response:**
```json
[
  {
    "id": 1,
    "totalUnits": 100,
    "occupiedUnits": 45,
    "baseScarcityMultiplier": 1,
    "scarcityFactor": 1.45,
    "basePricePerM2": 5000,
    "expectedDurationMonths": 0,
    "branchId": 1,
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:00:00.000Z"
  }
]
```

---

### GET `/api/pricing-engine/:id`
Obtener un pricing engine por ID.

**Response:**
```json
{
  "id": 1,
  "totalUnits": 100,
  "occupiedUnits": 45,
  "baseScarcityMultiplier": 1,
  "scarcityFactor": 1.45,
  "basePricePerM2": 5000,
  "expectedDurationMonths": 0,
  "branchId": 1,
  "createdAt": "2025-01-15T10:00:00.000Z",
  "updatedAt": "2025-01-15T10:00:00.000Z"
}
```

---

### POST `/api/pricing-engine`
Crear un nuevo pricing engine.

**Body (todos los campos requeridos):**
```json
{
  "totalUnits": 100,
  "occupiedUnits": 0,
  "scarcityFactor": 1,
  "basePricePerM2": 5000,
  "expectedDurationMonths": 0,
  "branchId": 1
}
```

**Campos:**
- `totalUnits` (number, required): Total de unidades disponibles
- `occupiedUnits` (number, required): Unidades actualmente ocupadas
- `scarcityFactor` (number, required): Factor de escasez (default: 0)
- `basePricePerM2` (number, required): Precio base por metro cuadrado
- `expectedDurationMonths` (number, required): Duración esperada en meses (default: 0)
- `branchId` (number, required): ID de la sucursal

**Response:**
```json
{
  "id": 1,
  "totalUnits": 100,
  "occupiedUnits": 0,
  "baseScarcityMultiplier": 1,
  "scarcityFactor": 1,
  "basePricePerM2": 5000,
  "expectedDurationMonths": 0,
  "branchId": 1,
  "createdAt": "2025-01-15T10:00:00.000Z",
  "updatedAt": "2025-01-15T10:00:00.000Z"
}
```

---

### PATCH `/api/pricing-engine/:id`
Actualizar un pricing engine existente.

**Body (todos los campos opcionales):**
```json
{
  "totalUnits": 120,
  "occupiedUnits": 50,
  "basePricePerM2": 5500
}
```

**Campos opcionales:**
- `totalUnits` (number)
- `occupiedUnits` (number)
- `scarcityFactor` (number)
- `basePricePerM2` (number)
- `expectedDurationMonths` (number)
- `branchId` (number)

**Response:**
```json
{
  "id": 1,
  "totalUnits": 120,
  "occupiedUnits": 50,
  "baseScarcityMultiplier": 1,
  "scarcityFactor": 1.4167,
  "basePricePerM2": 5500,
  "expectedDurationMonths": 0,
  "branchId": 1,
  "createdAt": "2025-01-15T10:00:00.000Z",
  "updatedAt": "2025-01-15T12:00:00.000Z"
}
```

---

### DELETE `/api/pricing-engine/:id`
Eliminar un pricing engine.

**Response:**
```json
{
  "status": "ok",
  "message": "Successfully deleted PricingEngine"
}
```

---

## 🏢 Floor Multiplier

### GET `/api/floor-multiplier`
Obtener todos los multiplicadores de piso.

**Response:**
```json
[
  {
    "id": 1,
    "floor": 0,
    "multiplier": 1,
    "pricingEngine": {
      "id": 1,
      "branchId": 1
    },
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:00:00.000Z"
  },
  {
    "id": 2,
    "floor": 1,
    "multiplier": 1.2,
    "pricingEngine": {
      "id": 1,
      "branchId": 1
    },
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:00:00.000Z"
  }
]
```

---

### GET `/api/floor-multiplier/:id`
Obtener un multiplicador de piso por ID.

**Response:**
```json
{
  "id": 1,
  "floor": 0,
  "multiplier": 1,
  "pricingEngine": {
    "id": 1,
    "branchId": 1
  },
  "createdAt": "2025-01-15T10:00:00.000Z",
  "updatedAt": "2025-01-15T10:00:00.000Z"
}
```

---

### POST `/api/floor-multiplier`
Crear un nuevo multiplicador de piso.

**Body (todos los campos requeridos):**
```json
{
  "floor": 2,
  "multiplier": 1.5,
  "pricingEngineId": 1
}
```

**Campos:**
- `floor` (number, required): Número de piso (0 = planta baja, 1 = primer piso, etc.)
- `multiplier` (number, required): Multiplicador de precio para este piso (ej: 1.2 = +20%)
- `pricingEngineId` (number, required): ID del pricing engine al que pertenece

**Validaciones:**
- No puede haber dos multiplicadores para el mismo piso en el mismo pricing engine

**Response:**
```json
{
  "id": 3,
  "floor": 2,
  "multiplier": 1.5,
  "createdAt": "2025-01-15T10:00:00.000Z",
  "updatedAt": "2025-01-15T10:00:00.000Z"
}
```

---

### PATCH `/api/floor-multiplier/:id`
Actualizar un multiplicador de piso existente.

**Body (todos los campos opcionales):**
```json
{
  "floor": 3,
  "multiplier": 1.8
}
```

**Campos opcionales:**
- `floor` (number)
- `multiplier` (number)

**Nota:** No se puede cambiar el `pricingEngineId`

**Response:**
```json
{
  "id": 3,
  "floor": 3,
  "multiplier": 1.8,
  "createdAt": "2025-01-15T10:00:00.000Z",
  "updatedAt": "2025-01-15T12:00:00.000Z"
}
```

---

### DELETE `/api/floor-multiplier/:id`
Eliminar un multiplicador de piso.

**Response:**
```json
{
  "status": "ok",
  "message": "Successfully deleted FloorMultiplier"
}
```

---

## 📏 Size Perm (Size Premium/Multiplier)

### GET `/api/size-perm`
Obtener todos los multiplicadores de tamaño.

**Response:**
```json
[
  {
    "id": 1,
    "multiplier": 1.3,
    "minRange": 0,
    "maxRange": 10,
    "branchId": 1,
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:00:00.000Z"
  },
  {
    "id": 2,
    "multiplier": 1.15,
    "minRange": 10.01,
    "maxRange": 25,
    "branchId": 1,
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:00:00.000Z"
  }
]
```

---

### GET `/api/size-perm/:id`
Obtener un multiplicador de tamaño por ID.

**Response:**
```json
{
  "id": 1,
  "multiplier": 1.3,
  "minRange": 0,
  "maxRange": 10,
  "branchId": 1,
  "createdAt": "2025-01-15T10:00:00.000Z",
  "updatedAt": "2025-01-15T10:00:00.000Z"
}
```

---

### POST `/api/size-perm`
Crear un nuevo multiplicador de tamaño.

**Body (todos los campos requeridos):**
```json
{
  "multiplier": 1.2,
  "minRange": 25.01,
  "maxRange": 50,
  "branchId": 1
}
```

**Campos:**
- `multiplier` (number, required): Multiplicador de precio basado en tamaño (ej: 1.2 = +20%)
- `minRange` (number, required): Área mínima en m² para este rango (puede ser 0)
- `maxRange` (number, required): Área máxima en m² para este rango
- `branchId` (number, required): ID de la sucursal

**Validaciones:**
- `minRange` debe ser menor que `maxRange`
- No puede haber rangos superpuestos para la misma sucursal

**Ejemplos de rangos válidos:**
```json
// Rango 1: 0-10 m²
{ "minRange": 0, "maxRange": 10, "multiplier": 1.3 }

// Rango 2: 10.01-25 m²
{ "minRange": 10.01, "maxRange": 25, "multiplier": 1.15 }

// Rango 3: 25.01-50 m²
{ "minRange": 25.01, "maxRange": 50, "multiplier": 1.0 }
```

**Response:**
```json
{
  "id": 3,
  "multiplier": 1.2,
  "minRange": 25.01,
  "maxRange": 50,
  "branchId": 1,
  "createdAt": "2025-01-15T10:00:00.000Z",
  "updatedAt": "2025-01-15T10:00:00.000Z"
}
```

---

### PATCH `/api/size-perm/:id`
Actualizar un multiplicador de tamaño existente.

**Body (todos los campos opcionales):**
```json
{
  "multiplier": 1.25,
  "maxRange": 60
}
```

**Campos opcionales:**
- `multiplier` (number)
- `minRange` (number)
- `maxRange` (number)
- `branchId` (number)

**Validaciones:**
- `minRange` debe ser menor que `maxRange` (considerando valores actuales + nuevos)
- No puede haber rangos superpuestos con otros size perms de la misma sucursal

**Response:**
```json
{
  "id": 3,
  "multiplier": 1.25,
  "minRange": 25.01,
  "maxRange": 60,
  "branchId": 1,
  "createdAt": "2025-01-15T10:00:00.000Z",
  "updatedAt": "2025-01-15T12:00:00.000Z"
}
```

---

### DELETE `/api/size-perm/:id`
Eliminar un multiplicador de tamaño.

**Response:**
```json
{
  "status": "ok",
  "message": "Successfully deleted SizePerm"
}
```

---

## 🧮 Cálculo de Precio Final

El precio final de un storage room se calcula usando la siguiente fórmula:

```
precioFinal = basePricePerM2 × scarcityFactor × floorMultiplier × sizeMultiplier × areaM2
```

### Ejemplo:

**Datos:**
- `basePricePerM2`: 5000 (desde PricingEngine)
- `scarcityFactor`: 1.5 (calculado automáticamente: 50% de ocupación)
- `floorMultiplier`: 1.2 (piso 1 tiene +20%)
- `sizeMultiplier`: 1.15 (storage de 15m² tiene +15%)
- `areaM2`: 15

**Cálculo:**
```
precioFinal = 5000 × 1.5 × 1.2 × 1.15 × 15
precioFinal = 155,250 ARS/mes
```

---

## ❌ Errores Comunes

### 400 - Bad Request
```json
{
  "statusCode": 400,
  "message": "FloorMultiplier already exists for floor 2"
}
```

### 401 - Unauthorized
```json
{
  "statusCode": 401,
  "message": "User not authenticated"
}
```

### 404 - Not Found
```json
{
  "statusCode": 404,
  "message": "PricingEngine not found"
}
```

### 422 - Validation Error
```json
{
  "statusCode": 422,
  "message": "Validation failed",
  "errors": [
    {
      "field": "multiplier",
      "message": "Expected number, received string"
    }
  ]
}
```

---

## 📝 Notas Importantes

1. **Actualización automática del scarcityFactor:**
   - Cuando se actualizan `totalUnits` u `occupiedUnits`, el `scarcityFactor` se recalcula automáticamente

2. **Actualización automática de precios:**
   - Cuando se crea/actualiza un StorageRoom, se actualizan las estadísticas del PricingEngine
   - Se recalculan los precios de todos los StorageRooms de la branch automáticamente

3. **Floor numbers:**
   - `0` = Planta Baja (PB)
   - `1` = Primer piso
   - `2` = Segundo piso
   - etc.

4. **Multiplicadores:**
   - Valores mayores a 1 aumentan el precio (ej: 1.2 = +20%)
   - Valores menores a 1 reducen el precio (ej: 0.9 = -10%)
   - Valor 1 mantiene el precio base

5. **Rangos de Size Perm:**
   - Deben cubrir todos los posibles tamaños de storage rooms
   - No pueden superponerse
   - Recomendado dejar pequeños gaps entre rangos (ej: 10-10.01)
