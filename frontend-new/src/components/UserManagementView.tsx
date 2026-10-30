import React, { useCallback, useEffect, useRef, useState } from 'react';

type UserRow = {
  id: string; name: string; email: string; role: string;
  state_id?: string | null; district_id?: string | null; subdistrict_id?: string | null; station_id?: string | null;
  approval_status?: string; requested_state_id?: string | null; requested_district_id?: string | null;
  requested_subdistrict_id?: string | null; requested_station_id?: string | null;
  state_name?: string | null;
district_name?: string | null;
subdistrict_name?: string | null;
};
type Option = { state_id?: string; district_id?: string; station_id?: string; name?: string; station_code?: string; code?: string };

const humanize = (value?: string | null) => value ? value.split('-').slice(value.startsWith('lgd-') ? 0 : 1).join(' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Not provided';

export function UserManagementView({ apiUrl, token, onMessage }: {
  apiUrl: string; token: string; onMessage: (message: string) => void;
}) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [stationsByUser, setStationsByUser] = useState<Record<string, Option[]>>({});
  const [drafts, setDrafts] = useState<Record<string, Partial<UserRow>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const onMessageRef = useRef(onMessage);
  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);

  const request = useCallback(async (url: string, init?: RequestInit) => {
    const response = await fetch(url, { ...init, headers: {
      Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init?.headers || {}),
    }});
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = data?.detail;
      throw new Error(typeof detail === 'string' ? detail : detail ? JSON.stringify(detail) : `Request failed (${response.status})`);
    }
    return data;
  }, [apiUrl, token]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await request(`${apiUrl}/users`);
      const rows: UserRow[] = data.users || [];
      setUsers(rows);
      setDrafts(Object.fromEntries(rows.map(u => [u.id, {
        role: u.role,
        state_id: u.state_id || u.requested_state_id || '',
        district_id: u.district_id || u.requested_district_id || '',
        station_id: u.station_id || '',
      }])));
    } catch (error) {
      onMessageRef.current(error instanceof Error ? error.message : 'Unable to load users.');
    } finally { setLoading(false); }
  }, [apiUrl, request]);
  useEffect(() => { void loadUsers(); }, [loadUsers]);

  const loadStations = async (user: UserRow) => {
    const stateId = user.requested_state_id || user.state_id || '';
    const districtId = user.requested_district_id || user.district_id || '';
    if (!stateId || !districtId) {
      onMessageRef.current('This registration has no requested railway district. Review it before assigning a station.');
      setStationsByUser(prev => ({ ...prev, [user.id]: [] }));
      return;
    }
    try {
      const params = new URLSearchParams({ state_id: stateId, district_id: districtId, limit: '500' });
      const result = await request(`${apiUrl}/api/locations/stations?${params.toString()}`);
      const items: Option[] = result.items || [];
      setStationsByUser(prev => ({ ...prev, [user.id]: items }));
      if (!items.length) onMessageRef.current('No railway stations are linked to the requested district. Do not approve this account until the station data is corrected.');
    } catch (error) {
      onMessageRef.current(error instanceof Error ? error.message : 'Unable to load stations.');
    }
  };

  const updateDraft = (id: string, field: keyof UserRow, value: string) => {
    setDrafts(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const saveAccess = async (user: UserRow) => {
    const draft = drafts[user.id] || {};
    const isAdmin = String(user.role || '').toUpperCase() === 'ADMIN';
    const stationId = String(draft.station_id || user.station_id || '');
    if (!stationId) { onMessageRef.current('Select a real railway station before saving access or approving this user.'); return; }
    setSaving(user.id);
    try {
      await request(`${apiUrl}/users/${encodeURIComponent(user.id)}/assignment`, {
        method: 'PATCH', body: JSON.stringify({
          role: draft.role || user.role,
          state_id: user.requested_state_id || user.state_id || '',
          district_id: user.requested_district_id || user.district_id || '',
          station_id: stationId,
        }),
      });
      onMessageRef.current(`Station and role saved for ${user.name || user.email}.`);
      await loadUsers();
      await loadStations(user);
    } catch (error) {
      onMessageRef.current(error instanceof Error ? error.message : 'Unable to save user access.');
    } finally { setSaving(null); }
  };

  const setApproval = async (user: UserRow, status: 'APPROVED' | 'REJECTED') => {
    if (status === 'APPROVED' && !user.station_id && !drafts[user.id]?.station_id) {
      onMessageRef.current('Save a valid railway station assignment before approving this account.');
      return;
    }
    setSaving(user.id);
    try {
      await request(`${apiUrl}/users/${encodeURIComponent(user.id)}/approval`, {
        method: 'PATCH', body: JSON.stringify({ status }),
      });
      onMessageRef.current(`${user.name || user.email}: ${status.toLowerCase()}.`);
      await loadUsers();
    } catch (error) {
      onMessageRef.current(error instanceof Error ? error.message : 'Unable to update approval.');
    } finally { setSaving(null); }
  };

  const visibleUsers = users.filter(u => `${u.name} ${u.email} ${u.role} ${u.approval_status || ''}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><h2 className="text-2xl font-bold text-on-surface">User Management</h2><p className="mt-1 text-sm text-on-surface-variant">Review the location requested at signup. Assign only a real station in that location before approval.</p></div>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email or role" className="w-full sm:w-72 rounded-xl border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary" />
    </div>
    {loading ? <div className="rounded-2xl border border-outline-variant p-6 text-sm">Loading users…</div> : visibleUsers.length === 0 ? <div className="rounded-2xl border border-outline-variant p-6 text-sm">No users found.</div> :
      <div className="space-y-4">{visibleUsers.map(user => {
        const draft = drafts[user.id] || {};
        const isAdmin = String(user.role || '').toUpperCase() === 'ADMIN';
        const requestedState = user.requested_state_id || user.state_id;
        const requestedDistrict = user.requested_district_id || user.district_id;
        const requestedMandal = user.requested_subdistrict_id || user.subdistrict_id;
        const stationOptions = stationsByUser[user.id] || [];

      return (
  <article
    key={user.id}
    className="rounded-2xl border border-outline-variant bg-surface p-5 shadow-sm"
  >
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="font-semibold text-on-surface">
          {user.name || 'Unnamed user'}
        </h3>
        <p className="text-sm text-on-surface-variant">{user.email}</p>
      </div>

      <div className="flex items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            user.approval_status === 'PENDING'
              ? 'bg-amber-100 text-amber-800'
              : user.approval_status === 'REJECTED'
                ? 'bg-red-100 text-red-800'
                : 'bg-emerald-100 text-emerald-800'
          }`}
        >
          {user.approval_status || 'APPROVED'}
        </span>
        <span className="text-xs text-on-surface-variant">
          ID: {user.id}
        </span>
      </div>
    </div>

    {!isAdmin && (
      <>
        <div className="mb-4 rounded-xl border border-outline-variant p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
            Location requested by user
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs text-on-surface-variant">State</p>
              <p className="font-medium text-on-surface">
                {user.state_name || humanize(requestedState)}
              </p>
            </div>

            <div>
              <p className="text-xs text-on-surface-variant">District</p>
              <p className="font-medium text-on-surface">
                {user.district_name || humanize(requestedDistrict)}
              </p>
            </div>

            <div>
              <p className="text-xs text-on-surface-variant">
                Mandal / local area
              </p>
              <p className="font-medium text-on-surface">
               {user.subdistrict_name || humanize(requestedMandal)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-xs font-semibold text-on-surface-variant">
            ROLE
            <select
              value={String(draft.role || user.role)}
              onChange={e => updateDraft(user.id, 'role', e.target.value)}
              className="mt-1 block w-full rounded-xl border border-outline-variant bg-surface px-3 py-2.5 text-sm text-on-surface"
            >
              <option value="OPERATOR">Operator</option>
              <option value="SAFETY_OFFICER">Safety Officer</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="ADMIN">Admin</option>
            </select>
          </label>

          <label className="text-xs font-semibold text-on-surface-variant">
            AUTHORIZED RAILWAY STATION
            <select
              value={String(draft.station_id || '')}
              onFocus={() => {
                if (!stationsByUser[user.id]) void loadStations(user);
              }}
              onChange={e =>
                updateDraft(user.id, 'station_id', e.target.value)
              }
              className="mt-1 block w-full rounded-xl border border-outline-variant bg-surface px-3 py-2.5 text-sm text-on-surface"
            >
              <option value="">Select station for requested district</option>
              {stationOptions.map(item => (
                <option key={item.station_id} value={item.station_id}>
                  {item.name || item.station_id}
                  {item.station_code || item.code
                    ? ` (${item.station_code || item.code})`
                    : ''}
                </option>
              ))}
            </select>
          </label>
        </div>
      </>
    )}

    <div className="mt-4 flex flex-wrap justify-end gap-2">
      {!isAdmin && (
        <button
          type="button"
          disabled={saving === user.id}
          onClick={() => void saveAccess(user)}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving === user.id ? 'Saving…' : 'Save role & station'}
        </button>
      )}

      {user.approval_status === 'PENDING' && !isAdmin && (
        <>
          <button
            type="button"
            disabled={saving === user.id}
            onClick={() => void setApproval(user, 'APPROVED')}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Approve
          </button>

          <button
            type="button"
            disabled={saving === user.id}
            onClick={() => void setApproval(user, 'REJECTED')}
            className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Reject
          </button>
        </>
      )}
    </div>
  </article>
);
      })}</div>
    }
  </div>;
}