'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  BarChart3,
  Building2,
  CircleAlert,
  History,
  Milestone,
  Table2,
} from 'lucide-react';

export const dashboardTabs = [
  {
    id: 'resumen',
    label: 'Resumen',
    description: 'Lo esencial de tu operación, de un vistazo.',
    icon: Activity,
  },
  {
    id: 'agencias',
    label: 'Agencias',
    description: 'Explora las agencias y su estado de ejecución.',
    icon: Building2,
  },
  {
    id: 'hito-50',
    label: 'Hito 50%',
    description: 'Agencias en proceso que acaban de alcanzar o superar el 50%.',
    icon: Milestone,
  },
  {
    id: 'tabla-detalle',
    label: 'Detalle',
    description: 'Consulta, ordena y exporta cada registro.',
    icon: Table2,
  },
  {
    id: 'analitica',
    label: 'Analítica',
    description: 'Descubre cómo se distribuye el avance por estado y etapa.',
    icon: BarChart3,
  },
  {
    id: 'linea-tiempo',
    label: 'Historial',
    description: 'Sigue la evolución de cada agencia a través del tiempo.',
    icon: History,
  },
  {
    id: 'prioridades',
    label: 'Prioridades',
    description: 'Identifica las fechas vencidas y los reportes pendientes.',
    icon: CircleAlert,
  },
] as const;

export type DashboardTab = (typeof dashboardTabs)[number]['id'];

function tabFromHash(): DashboardTab | undefined {
  const id = window.location.hash.slice(1);
  return dashboardTabs.find((tab) => tab.id === id)?.id;
}

export function useDashboardNavigation() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('resumen');
  const previousTab = useRef(activeTab);
  useEffect(() => {
    if (previousTab.current === activeTab) return;
    previousTab.current = activeTab;
    const frame = window.requestAnimationFrame(() => {
      const workspace = document.getElementById('dashboard-workspace');
      const header = document.querySelector('.dashboard-header');
      if (!workspace) return;
      const top =
        workspace.getBoundingClientRect().top +
        window.scrollY -
        (header?.getBoundingClientRect().height ?? 110) -
        20;
      window.scrollTo({
        top: Math.max(0, top),
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeTab]);
  useEffect(() => {
    const sync = () => {
      const tab = window.location.hash ? tabFromHash() : 'resumen';
      if (tab) setActiveTab(tab);
    };
    sync();
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('popstate', sync);
    };
  }, []);

  const navigate = (value: DashboardTab) => {
    setActiveTab(value);
    if (window.location.hash !== `#${value}`) {
      window.history.pushState(null, '', `#${value}`);
    }
  };
  return { activeTab, navigate };
}
