import React, { useEffect, useState } from 'react';
import { USER_AVATAR_URL } from '../data/mockData';
import { SafetyAlert } from '../types';

interface HeaderProps {
  currentRole: string;
  userName: string;
  onRoleChange: (role: string) => void;
  alerts: SafetyAlert[];
  onOpenAlert: (id: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  userName,
  alerts,
  onOpenAlert,
}) => {
  const [utcTime, setUtcTime] = useState('UTC 00:00:00');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();

      setUtcTime(
        `UTC ${String(now.getUTCHours()).padStart(2, '0')}:${String(
          now.getUTCMinutes()
        ).padStart(2, '0')}:${String(now.getUTCSeconds()).padStart(2, '0')}`
      );
    };

    updateTime();
    const interval = window.setInterval(updateTime, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const unreadAlerts = alerts.filter((alert) => !alert.resolved);

  const normalizedRole = currentRole.toLowerCase();

  const roleLabel =
    normalizedRole === 'administrator' || normalizedRole === 'admin'
      ? 'Administrator'
      : normalizedRole === 'operator'
        ? 'Operator'
        : normalizedRole === 'maintenance'
          ? 'Maintenance'
          : 'Safety Officer';

  const handleLogout = () => {
    localStorage.removeItem('railway_access_token');
    localStorage.removeItem('railway_auth_user');
    window.location.reload();
  };

  return (
    <header className="fixed top-0 left-72 right-0 h-20 bg-background/95 backdrop-blur-xl border-b border-outline-variant/20 z-40 flex items-center justify-between px-7">
      {/* UTC CLOCK ONLY */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20">
        <span className="material-symbols-outlined text-primary text-[18px]">
          schedule
        </span>

        <span className="font-data-mono-sm text-on-surface-variant">
          {utcTime}
        </span>
      </div>

      {/* NOTIFICATIONS AND PROFILE */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            type="button"
            aria-label="Notifications"
            onClick={() => {
              setShowNotifications((value) => !value);
              setShowProfile(false);
            }}
            className="relative w-11 h-11 flex items-center justify-center rounded-xl bg-surface-container-low border border-outline-variant/20 text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all"
          >
            <span className="material-symbols-outlined text-[22px]">
              notifications
            </span>

            {unreadAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 flex items-center justify-center rounded-full bg-error text-white text-[10px] font-bold">
                {unreadAlerts.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-3 w-80 bg-surface-container border border-outline-variant/30 rounded-2xl shadow-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-outline-variant/20 flex items-center justify-between">
                <span className="text-sm font-semibold text-on-surface">
                  Safety Alerts
                </span>

                <span className="text-[10px] font-data-mono-sm text-error">
                  {unreadAlerts.length} ACTIVE
                </span>
              </div>

              <div className="max-h-72 overflow-y-auto p-2">
                {unreadAlerts.length === 0 ? (
                  <div className="py-8 text-center text-sm text-on-surface-variant">
                    No active alerts
                  </div>
                ) : (
                  unreadAlerts.map((alert) => (
                    <button
                      type="button"
                      key={alert.id}
                      onClick={() => {
                        onOpenAlert(alert.id);
                        setShowNotifications(false);
                      }}
                      className="w-full text-left p-3 rounded-xl hover:bg-surface-container-high transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            alert.type === 'CRITICAL'
                              ? 'bg-error-container text-on-error-container'
                              : 'bg-surface-container-highest text-secondary'
                          }`}
                        >
                          {alert.type}
                        </span>

                        <span className="text-[10px] font-data-mono-sm text-outline">
                          {alert.detectedTimeAgo}
                        </span>
                      </div>

                      <div className="text-xs font-semibold text-on-surface">
                        {alert.title}
                      </div>

                      <div className="text-[11px] text-on-surface-variant mt-1 truncate">
                        {alert.milepost}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowProfile((value) => !value);
              setShowNotifications(false);
            }}
            className="flex items-center gap-3 px-2 py-1.5 rounded-xl hover:bg-surface-container-low transition-colors"
          >
            <img
              src={USER_AVATAR_URL}
              alt="Profile"
              className="w-10 h-10 rounded-full object-cover ring-1 ring-primary/40"
            />

            <div className="text-left hidden sm:block">
              <div className="text-sm font-semibold text-on-surface">
                {userName || 'User'}
              </div>

              <div className="text-[11px] font-data-mono-sm text-primary">
                {roleLabel}
              </div>
            </div>

            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
              {showProfile ? 'expand_less' : 'expand_more'}
            </span>
          </button>

          {showProfile && (
            <div className="absolute right-0 top-full mt-3 w-56 bg-surface-container border border-outline-variant/30 rounded-2xl shadow-2xl p-2">
              <div className="px-3 py-3 border-b border-outline-variant/20 mb-1">
                <div className="text-sm font-semibold text-on-surface">
                  {userName || 'User'}
                </div>

                <div className="text-[11px] font-data-mono-sm text-primary mt-1">
                  {roleLabel}
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-error hover:bg-error-container/20 transition-colors"
              >
                <span className="material-symbols-outlined text-[19px]">
                  logout
                </span>

                <span className="text-sm font-semibold">
                  Logout
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};