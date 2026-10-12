import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function Login() {
  const demoLoginLock = useRef(false);
  const [demoLoginBusy, setDemoLoginBusy] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    if (demoLoginLock.current) return;
    demoLoginLock.current = true;
    setDemoLoginBusy(true);
    setError('');
    try {
      const response = await api.get('/auth/demo-credentials');
      const credentials = response.data;
      if (typeof credentials?.email !== 'string' || !credentials.email || typeof credentials?.password !== 'string' || !credentials.password) {
        throw new Error('Demo credentials are unavailable.');
      }
      setEmail(credentials.email);
      setPassword(credentials.password);
      await login(credentials.email, credentials.password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Demo credentials are unavailable. Try again shortly.');
    } finally {
      demoLoginLock.current = false;
      setDemoLoginBusy(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 to-primary-800 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">AI Meeting Agent</h1>
            <p className="text-gray-500 mt-2">Attends and acts on your meetings</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              disabled={demoLoginBusy || loading}
              type="button"
              onClick={handleDemoLogin}
              className="w-full btn-secondary py-3 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {demoLoginBusy ? 'Logging in as Demo…' : 'Log In as Demo'}
            </button>
            <p className="text-center text-xs text-gray-500 mt-3">
              Log in with the available native demo account
            </p>
          </div>
        </div>

        <p className="text-center text-white/80 text-sm mt-6">
          Premium AI Meeting Agent - $20-50/user/mo
        </p>
      </div>
    </div>
  );
}
