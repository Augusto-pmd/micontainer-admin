import Swal from 'sweetalert2';
import type { SweetAlertIcon } from 'sweetalert2';

// Configuración base opcional
const baseConfig = {
  confirmButtonColor: '#166534', // green-800
  cancelButtonColor: '#991b1b', // red-800
  buttonsStyling: true,
};

export const showSuccess = (title: string, text?: string) => {
  return Swal.fire({
    ...baseConfig,
    icon: 'success',
    title,
    text,
    timer: 2500,
    showConfirmButton: false,
    toast: true,
    position: 'top-end',
  });
};

export const showError = (title: string, text?: string) => {
  return Swal.fire({
    ...baseConfig,
    icon: 'error',
    title,
    text,
    confirmButtonText: 'Cerrar',
  });
};

export const showInfo = (title: string, text?: string) => {
  return Swal.fire({
    ...baseConfig,
    icon: 'info',
    title,
    text,
    confirmButtonText: 'Entendido',
  });
};

export const showWarning = (title: string, text?: string) => {
  return Swal.fire({
    ...baseConfig,
    icon: 'warning',
    title,
    text,
    confirmButtonText: 'Ok',
  });
};

export const showConfirm = async (title: string, text?: string, confirmButtonText = 'Confirmar') => {
  const result = await Swal.fire({
    ...baseConfig,
    icon: 'question',
    title,
    text,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText: 'Cancelar',
    reverseButtons: true,
  });
  return result.isConfirmed;
};

export const showDeleteConfirm = async (
  itemName: string,
  customMessage?: string,
  additionalInfo?: string[]
) => {
  const htmlContent = additionalInfo 
    ? `
      <div style="text-align: left; margin-top: 10px;">
        <p style="margin-bottom: 10px;"><strong>Esta acción eliminará:</strong></p>
        <ul style="margin-left: 20px; color: #666;">
          ${additionalInfo.map(info => `<li>${info}</li>`).join('')}
        </ul>
        <p style="margin-top: 15px; color: #991b1b; font-weight: 500;">
          ⚠️ Esta acción no se puede deshacer
        </p>
      </div>
    `
    : undefined;

  const result = await Swal.fire({
    title: '¿Está seguro?',
    html: htmlContent || `<p>Está a punto de eliminar <strong>"${itemName}"</strong></p>${customMessage ? `<p style="margin-top: 10px; color: #666;">${customMessage}</p>` : ''}<p style="margin-top: 15px; color: #991b1b; font-weight: 500;">⚠️ Esta acción no se puede deshacer</p>`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc2626', // red-600
    cancelButtonColor: '#6b7280', // gray-500
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar',
    reverseButtons: true,
    focusCancel: true,
  });
  
  return result.isConfirmed;
};

export const showApiError = (error: any, fallbackMessage = 'Ocurrió un error inesperado') => {
  // Intenta extraer mensaje de error del backend
  const message = error?.response?.data?.message || error?.message || fallbackMessage;
  return showError('Error', message);
};

export const showApiValidationErrors = (errors: Record<string, string[] | string> | string) => {
  if (typeof errors === 'string') {
    return showError('Error de validación', errors);
  }

  const html = Object.entries(errors)
    .map(([field, msgs]) => {
      const list = Array.isArray(msgs) ? msgs : [msgs];
      const items = list.map(m => `<li>${m}</li>`).join('');
      return `<div style='text-align:left'><strong>${field}</strong><ul style='margin:4px 0 8px 16px'>${items}</ul></div>`;
    })
    .join('');

  return Swal.fire({
    ...baseConfig,
    icon: 'error',
    title: 'Errores de validación',
    html,
    width: 480,
  });
};

export type { SweetAlertIcon };
