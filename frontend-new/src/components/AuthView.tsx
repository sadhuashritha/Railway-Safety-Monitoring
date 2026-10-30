import React, { useEffect, useState } from 'react';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  assigned_location?: string;
  assignedLocation?: string;
  location?: string;
  station_name?: string;
  assigned_station?: string;
  assignedStation?: string;
  subdistrict_name?: string;
  assigned_subdistrict?: string;
  district_name?: string;
  assigned_district?: string;
}


interface AuthViewProps {
  onAuthenticated: (user: AuthUser) => void;
}

const API_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

export const AuthView: React.FC<AuthViewProps> = ({
  onAuthenticated,
}) => {
  const [isSignup, setIsSignup] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [states, setStates] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [stateId, setStateId] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [subdistrictId, setSubdistrictId] = useState('');
  const [stationId, setStationId] = useState('');

  useEffect(() => {
    if (!isSignup) return;
    fetch(`${API_URL}/api/locations/states`).then(r => r.json()).then(d => setStates(d.items || [])).catch(() => setStates([]));
  }, [isSignup]);
    // Load districts when the selected state changes.
  useEffect(() => {
    setDistrictId('');
    setSubdistrictId('');
    setStationId('');
    setDistricts([]);
    setAreas([]);
    setStations([]);

    if (!stateId) return;

    fetch(`${API_URL}/api/locations/districts?state_id=${encodeURIComponent(stateId)}`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to load districts');
        return r.json();
      })
      .then(d => setDistricts(d.items || []))
      .catch(() => setDistricts([]));
  }, [stateId]);

  // Load mandals independently of railway station availability.
  useEffect(() => {
    setSubdistrictId('');
    setStationId('');
    setAreas([]);
    setStations([]);

    if (!districtId) return;

    fetch(`${API_URL}/api/locations/subdistricts?district_id=${encodeURIComponent(districtId)}`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to load mandals');
        return r.json();
      })
      .then(d => setAreas(d.items || []))
      .catch(() => setAreas([]));
  }, [districtId]);

  // Load available railway stations separately.
  useEffect(() => {
    setStationId('');
    setStations([]);

    if (!stateId) return;

    const params = new URLSearchParams({
      state_id: stateId,
      limit: '500',
    });

    if (districtId) params.set('district_id', districtId);
    if (subdistrictId) params.set('subdistrict_id', subdistrictId);

    fetch(`${API_URL}/api/locations/stations?${params.toString()}`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to load stations');
        return r.json();
      })
      .then(d => setStations(d.items || []))
      .catch(() => setStations([]));
  }, [stateId, districtId, subdistrictId]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    setError('');

    // -----------------------------------------
    // BASIC VALIDATION
    // -----------------------------------------
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }

    if (isSignup) {
      if (!name.trim()) {
        setError('Please enter your full name.');
        return;
      }

      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (!stateId || !districtId) {
        setError('Select a state and a district that has railway stations.');
        return;
      }
    }

    setLoading(true);

    try {
      // -----------------------------------------
      // API ENDPOINT
      // -----------------------------------------
      const endpoint = isSignup
        ? '/users/signup'
        : '/users/login';

      // -----------------------------------------
      // REQUEST BODY
      // -----------------------------------------
      const body = isSignup
        ? {
            name: name.trim(),
            email: email.trim(),
            password,
            state_id: stateId,
            district_id: districtId || null,
            subdistrict_id: subdistrictId || null,
          }
        : {
            email: email.trim(),
            password,
          };

      // -----------------------------------------
      // API REQUEST
      // -----------------------------------------
      const response = await fetch(
        `${API_URL}${endpoint}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );

      let data: any = {};

      try {
        data = await response.json();
      } catch {
        throw new Error('Invalid response from server.');
      }

      // -----------------------------------------
      // API ERROR
      // -----------------------------------------
      if (!response.ok) {
        const detail = data?.detail ?? data?.message;
        const message = typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
            ? detail.map((item: any) => {
                if (typeof item === 'string') return item;
                const field = Array.isArray(item?.loc) ? item.loc.slice(1).join('.') : '';
                const reason = item?.msg || JSON.stringify(item);
                return field ? `${field}: ${reason}` : reason;
              }).join('; ')
            : detail && typeof detail === 'object'
              ? JSON.stringify(detail)
              : 'Authentication failed.';
        throw new Error(message);
      }

      // -----------------------------------------
      // SIGNUP SUCCESS
      // -----------------------------------------
      if (isSignup) {
        setIsSignup(false);

        setName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setStateId(''); setDistrictId(''); setSubdistrictId(''); setStationId('');

        setError(
          'Registration submitted. Your account is pending admin approval.'
        );

        return;
      }

      // -----------------------------------------
      // LOGIN SUCCESS
      // -----------------------------------------
      const user = data?.user;

      if (!user) {
        throw new Error(
          'User information was not returned by the server.'
        );
      }

      // -----------------------------------------
      // GET AUTHENTICATION TOKEN
      // -----------------------------------------
      const accessToken = data?.access_token;

      if (!accessToken) {
        throw new Error(
          'Authentication token was not returned by the server.'
        );
      }

      // -----------------------------------------
      // CREATE FRONTEND USER OBJECT
      // -----------------------------------------
const authUser: AuthUser = {
  id: String(user.id),
  name: user.name,
  email: user.email,
  role: user.role,
  assigned_location: user.assigned_location,
  assignedLocation: user.assignedLocation,
  location: user.location,
  station_name: user.station_name,
  assigned_station: user.assigned_station,
  assignedStation: user.assignedStation,
  subdistrict_name: user.subdistrict_name,
  assigned_subdistrict: user.assigned_subdistrict,
  district_name: user.district_name,
  assigned_district: user.assigned_district,
};


      // -----------------------------------------
      // CLEAR ANY OLD SESSION
      // -----------------------------------------
      localStorage.removeItem('railway_access_token');
      localStorage.removeItem('railway_auth_user');

      // -----------------------------------------
      // STORE NEW AUTHENTICATED SESSION
      // -----------------------------------------
      localStorage.setItem(
        'railway_access_token',
        accessToken
      );

      localStorage.setItem(
        'railway_auth_user',
        JSON.stringify(authUser)
      );

      // -----------------------------------------
      // SEND USER TO APP
      // -----------------------------------------
      onAuthenticated(authUser);

    } catch (err: any) {
      setError(
        err?.message ||
        'Unable to connect to the server.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-surface flex">

      {/* =========================================
          LEFT BRANDING PANEL
      ========================================= */}
      <div className="hidden lg:flex w-1/2 bg-surface-container-low border-r border-outline-variant/30 p-16 flex-col justify-between">

        <div>

          {/* Logo */}
          <div className="flex items-center gap-4 mb-20">

            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg">

              <span className="material-symbols-outlined text-[30px] text-on-primary">
                train
              </span>

            </div>

            <div>

              <h1 className="text-2xl font-bold text-on-surface">
                RailWatch
              </h1>

              <p className="text-sm text-on-surface-variant">
                Railway Safety Monitoring Platform
              </p>

            </div>

          </div>

          {/* Main heading */}
          <div className="max-w-xl">

            <h2 className="text-5xl font-bold leading-tight text-on-surface">

              Railway safety monitoring,

              <span className="block text-primary mt-2">
                built for safer operations.
              </span>

            </h2>

            <p className="mt-8 text-lg leading-8 text-on-surface-variant">

              Monitor railway environments, analyze camera
              footage, manage safety alerts and coordinate
              incidents from one centralized platform.

            </p>

          </div>

        </div>

        {/* Bottom status */}
        <div className="flex items-center gap-3 text-on-surface-variant">

          <span className="w-3 h-3 rounded-full bg-tertiary animate-pulse" />

          <span className="text-sm">
            Secure Operations Platform
          </span>

        </div>

      </div>

      {/* =========================================
          RIGHT AUTH PANEL
      ========================================= */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-surface">

        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-12">

            <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center">

              <span className="material-symbols-outlined text-on-primary">
                train
              </span>

            </div>

            <div>

              <div className="font-bold text-xl">
                RailWatch
              </div>

              <div className="text-xs text-on-surface-variant">
                Railway Safety Monitoring Platform
              </div>

            </div>

          </div>

          {/* Heading */}
          <div className="mb-8">

            <h2 className="text-3xl font-bold text-on-surface">

              {isSignup
                ? 'Create your account'
                : 'Welcome back'}

            </h2>

            <p className="mt-2 text-on-surface-variant">

              {isSignup
                ? 'Register for RailWatch operations access.'
                : 'Sign in to continue to RailWatch.'}

            </p>

          </div>

          {/* Error / success */}
          {error && (

            <div
              className={`mb-6 px-4 py-3 rounded-xl border text-sm ${
                error.includes('successfully')
                  ? 'bg-tertiary-container/20 border-tertiary/40 text-tertiary'
                  : 'bg-error-container/20 border-error/40 text-error'
              }`}
            >
              {error}
            </div>

          )}

          {/* =====================================
              FORM
          ===================================== */}
          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >

            {/* Name */}
            {isSignup && (

              <div>

                <label className="block mb-2 text-sm font-semibold">
                  Full Name
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  placeholder="Enter your full name"
                  className="w-full px-4 py-3.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface placeholder:text-on-surface-variant/60 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                />

              </div>

            )}

            {isSignup && <div className="grid grid-cols-1 gap-3">
              <label className="block text-sm font-semibold">Railway State
                <select required value={stateId} onChange={e => setStateId(e.target.value)} className="mt-2 w-full rounded-xl bg-surface-container-low border border-outline-variant/40 px-4 py-3 text-on-surface">
                  <option value="">Select state</option>{states.map(item => <option key={item.state_id} value={item.state_id}>{item.name}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold">District
                <select value={districtId} onChange={e => setDistrictId(e.target.value)} disabled={!stateId} className="mt-2 w-full rounded-xl bg-surface-container-low border border-outline-variant/40 px-4 py-3 text-on-surface disabled:opacity-50">
                  <option value="">Select district (if available)</option>{districts.map(item => <option key={item.district_id} value={item.district_id}>{item.name}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold">Local area / Mandal (only where railway stations exist)
                <select value={subdistrictId} onChange={e => setSubdistrictId(e.target.value)} disabled={!districtId} className="mt-2 w-full rounded-xl bg-surface-container-low border border-outline-variant/40 px-4 py-3 text-on-surface disabled:opacity-50">
                  <option value="">Select local area</option>{areas.map(item => <option key={item.subdistrict_id} value={item.subdistrict_id}>{item.name}</option>)}
                </select>
              </label>

            </div>}

            {/* Email */}
            <div>

              <label className="block mb-2 text-sm font-semibold">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="Enter your email"
                autoComplete="email"
                className="w-full px-4 py-3.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface placeholder:text-on-surface-variant/60 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
              />

            </div>

            {/* Password */}
            <div>

              <label className="block mb-2 text-sm font-semibold">
                Password
              </label>

              <div className="relative">

                <input
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="Enter your password"
                  autoComplete={
                    isSignup
                      ? 'new-password'
                      : 'current-password'
                  }
                  className="w-full px-4 py-3.5 pr-12 rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface placeholder:text-on-surface-variant/60 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                >

                  <span className="material-symbols-outlined">
                    {showPassword
                      ? 'visibility'
                      : 'visibility_off'}
                  </span>

                </button>

              </div>

            </div>

            {/* Confirm Password */}
            {isSignup && (

              <div>

                <label className="block mb-2 text-sm font-semibold">
                  Confirm Password
                </label>

                <div className="relative">

                  <input
                    type={
                      showConfirmPassword
                        ? 'text'
                        : 'password'
                    }
                    value={confirmPassword}
                    onChange={(e) =>
                      setConfirmPassword(
                        e.target.value
                      )
                    }
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                    className="w-full px-4 py-3.5 pr-12 rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface placeholder:text-on-surface-variant/60 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(
                        !showConfirmPassword
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                  >

                    <span className="material-symbols-outlined">
                      {showConfirmPassword
                        ? 'visibility'
                        : 'visibility_off'}
                    </span>

                  </button>

                </div>

              </div>

            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl bg-primary text-on-primary font-bold text-base hover:brightness-105 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg"
            >

              {loading
                ? isSignup
                  ? 'Creating Account...'
                  : 'Signing In...'
                : isSignup
                  ? 'Create Account'
                  : 'Sign In'}

            </button>

          </form>

          {/* Switch login/signup */}
          <div className="text-center mt-7 text-sm text-on-surface-variant">

            {isSignup
              ? 'Already have an account?'
              : "Don't have an account?"}

            <button
              type="button"
              onClick={() => {
                setIsSignup(!isSignup);
                setError('');
                setPassword('');
                setConfirmPassword('');
              }}
              className="ml-2 text-primary font-semibold hover:underline"
            >

              {isSignup
                ? 'Sign In'
                : 'Create Account'}

            </button>

          </div>

          {/* Security */}
          <div className="mt-10 pt-6 border-t border-outline-variant/20 flex items-center gap-3">

            <span className="material-symbols-outlined text-tertiary">
              verified_user
            </span>

            <div>

              <div className="text-xs font-bold tracking-wider text-on-surface">
                SECURE ACCESS
              </div>

              <div className="text-xs text-on-surface-variant mt-1">
                Railway safety operations environment
              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
