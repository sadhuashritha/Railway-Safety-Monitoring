import React from 'react';

export type NavModule =
  | 'dashboard'
  | 'cctv-and-ai-detection'
  | 'safety-alerts'
  | 'incident-management'
  | 'detection-history'
  | 'analytics-and-performance'
  | 'admin-and-cameras';

interface SidebarProps {
  currentModule: NavModule;
  currentRole: string;
  onNavigate: (module: NavModule) => void;
  onOpenSos: () => void;
  activeAlertCount?: number;
  userLocation?: string;
}

const ROLE_PERMISSIONS: Record<string, NavModule[]> = {
  admin: [
    'dashboard',
    'cctv-and-ai-detection',
    'safety-alerts',
    'incident-management',
    'detection-history',
    'analytics-and-performance',
    'admin-and-cameras',
  ],

  administrator: [
    'dashboard',
    'cctv-and-ai-detection',
    'safety-alerts',
    'incident-management',
    'detection-history',
    'analytics-and-performance',
    'admin-and-cameras',
  ],

  safety_officer: [
    'dashboard',
    'cctv-and-ai-detection',
    'safety-alerts',
    'incident-management',
    'detection-history',
    'analytics-and-performance',
  ],

  operator: [
    'dashboard',
    'cctv-and-ai-detection',
    'safety-alerts',
    'detection-history',
  ],

  maintenance: [
    'dashboard',
    'incident-management',
  ],
};

const NAV_ITEMS: {
  module: NavModule;
  label: string;
  icon: string;
}[] = [
  { module: 'dashboard', label: 'Dashboard', icon: 'grid_view' },
  {
    module: 'cctv-and-ai-detection',
    label: 'CCTV & Detection',
    icon: 'videocam',
  },
  { module: 'safety-alerts', label: 'Safety Alerts', icon: 'warning' },
  {
    module: 'incident-management',
    label: 'Incident Management',
    icon: 'local_activity',
  },
  {
    module: 'detection-history',
    label: 'Detection History',
    icon: 'history',
  },
  {
    module: 'analytics-and-performance',
    label: 'Analytics & Performance',
    icon: 'analytics',
  },
  {
    module: 'admin-and-cameras',
    label: 'Admin & Cameras',
    icon: 'settings',
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentModule,
  currentRole,
  onNavigate,
  activeAlertCount = 0,
  userLocation,
}) => {
  const normalizedRole = currentRole.toLowerCase();

  const isAdmin =
    normalizedRole === 'admin' ||
    normalizedRole === 'administrator';

  const allowedModules =
    ROLE_PERMISSIONS[normalizedRole] || ROLE_PERMISSIONS.operator;

  return (
    <aside className="fixed left-0 top-0 h-screen w-72 bg-background border-r border-outline-variant/20 z-50 flex flex-col">
      {/* BRAND */}
      <div className="h-20 px-6 flex items-center gap-3 border-b border-outline-variant/20">
        <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center overflow-hidden border border-outline-variant/20">
          <span className="material-symbols-outlined text-primary text-3xl">
            train
          </span>
        </div>

        <div>
          <div className="text-lg font-semibold tracking-tight text-on-surface">
            RailWatch
          </div>

          <div className="text-[9px] font-data-mono-sm uppercase tracking-widest text-primary">
            Railway Safety
          </div>
        </div>
      </div>

      {/* NAVIGATION */}
      <div className="flex-1 px-4 py-6 overflow-y-auto">
        <div className="px-3 mb-3">
          <span className="text-[10px] font-data-mono-sm uppercase tracking-[0.18em] text-outline">
            Operational Modules
          </span>
        </div>

        <nav className="space-y-1.5">
          {NAV_ITEMS.map((item) => {
            if (!allowedModules.includes(item.module)) {
              return null;
            }

            const active = currentModule === item.module;

            return (
              <button
                key={item.module}
                type="button"
                onClick={() => onNavigate(item.module)}
                className={`
                  w-full h-12 px-4 rounded-xl
                  flex items-center justify-between
                  text-left transition-all duration-200
                  ${
                    active
                      ? 'bg-surface-container-high text-primary border border-primary/30 shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface border border-transparent'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`
                      material-symbols-outlined text-[20px]
                      ${active ? 'text-primary' : 'text-outline'}
                    `}
                  >
                    {item.icon}
                  </span>

                  <span className="text-sm font-medium">
                    {item.label}
                  </span>
                </div>

                {item.module === 'cctv-and-ai-detection' && (
                  <span className="w-2 h-2 rounded-full bg-tertiary shadow-[0_0_8px_rgba(45,212,191,0.7)]" />
                )}

                {item.module === 'safety-alerts' && activeAlertCount > 0 && (
                  <span className="min-w-7 h-5 px-1.5 rounded-md bg-error text-white text-[10px] font-bold flex items-center justify-center">
                    {activeAlertCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ASSIGNED LOCATION — NOT SHOWN FOR ADMIN */}
      {!isAdmin && (
        <div className="p-4 border-t border-outline-variant/20">
          <div className="rounded-xl bg-surface-container-low border border-outline-variant/20 p-4">
            <div className="text-[10px] font-data-mono-sm uppercase tracking-widest text-outline mb-3">
              Assigned Location
            </div>

            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-primary text-[22px]">
                location_on
              </span>

              <div className="min-w-0">
                <div className="text-sm text-on-surface font-medium break-words">
                  {userLocation || 'Location not assigned'}
                </div>

                <div className="text-[10px] font-data-mono-sm text-outline mt-1">
                  User account assignment
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};