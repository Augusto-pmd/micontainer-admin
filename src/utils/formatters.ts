/**
 * Formatea el número de piso para mostrar "PB" cuando es 0
 * @param floor - Número del piso (0 para planta baja)
 * @returns String formateado ("PB" o "Piso N")
 */
export const formatFloor = (floor: number | string): string => {
  const floorNum = typeof floor === 'string' ? parseInt(floor) : floor;
  return floorNum === 0 ? 'PB' : `Piso ${floorNum}`;
};
