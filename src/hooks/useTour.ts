import { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const TOUR_KEY = 'mc-admin-tour-v1';

export function useTour(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;
    if (localStorage.getItem(TOUR_KEY)) return; // ya lo hizo

    const driverObj = driver({
      showProgress: true,
      animate: true,
      overlayColor: '#000',
      overlayOpacity: 0.55,
      smoothScroll: true,
      nextBtnText: 'Siguiente →',
      prevBtnText: '← Anterior',
      doneBtnText: '¡Empezar!',
      onDestroyStarted: () => {
        localStorage.setItem(TOUR_KEY, '1');
        driverObj.destroy();
      },
      steps: [
        {
          element: '#tour-dashboard',
          popover: {
            title: '👋 Bienvenido al panel',
            description:
              'Este es tu centro de operaciones. En 30 segundos te mostramos todo lo que podés hacer.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#tour-kpis',
          popover: {
            title: '📊 Métricas en tiempo real',
            description:
              'Ves de un vistazo cuántas bauleras tenés, cuántas están disponibles, ocupadas y la facturación proyectada mensual.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#tour-quicklinks',
          popover: {
            title: '⚡ Acceso rápido',
            description:
              'Los accesos directos te llevan de un clic a cualquier sección. También podés usar el menú lateral.',
            side: 'top',
            align: 'start',
          },
        },
        {
          element: '#tour-nav-inventory',
          popover: {
            title: '🗺️ Inventario de bauleras',
            description:
              'Vista visual de las 164 bauleras por piso. Verde = disponible, rojo = ocupada. Se actualiza en tiempo real.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '#tour-nav-orders',
          popover: {
            title: '📋 Órdenes y clientes',
            description:
              'Desde acá gestionás reservas activas, la base de clientes, operadores y el motor de precios.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '#tour-kpis',
          popover: {
            title: '✅ ¡Listo para operar!',
            description:
              'Ya conocés el panel. Podés repetir este tour en cualquier momento desde el menú de tu perfil.',
            side: 'bottom',
            align: 'center',
          },
        },
      ],
    });

    // Pequeño delay para que el DOM esté listo
    const t = setTimeout(() => driverObj.drive(), 800);
    return () => clearTimeout(t);
  }, [enabled]);
}

/** Llama esto para resetear el tour (útil para testing o botón "Ver tour") */
export function resetTour() {
  localStorage.removeItem(TOUR_KEY);
}
