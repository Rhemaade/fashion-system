import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user',
    gender: 'male',
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const endpoint = isRegistering ? '/auth/register' : '/auth/login';
      const payload = isRegistering ? formData : { email: formData.email, password: formData.password };
      const response = await axios.post(endpoint, payload);
      login(response.data.token, response.data.user);
      navigate('/dashboard');
    } catch (error) {
      console.error(error);
      setErrorMsg(error.response?.data?.error || 'Network error. Make sure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-[30px] border border-white/60 bg-white/72 p-8 shadow-[0_28px_80px_rgba(18,18,18,0.1)] backdrop-blur-xl">
        <div className="text-[0.72rem] font-semibold uppercase tracking-[0.34em] text-[#667085]">Atelier</div>
        <h1 className="mt-4 text-[3rem] leading-none text-[#121212]">
          {isRegistering ? 'Create account' : 'Welcome back'}
        </h1>
        <p className="mt-3 text-sm leading-7 text-[#525d6f]">
          {isRegistering
            ? 'Create your Atelier account to begin generating looks.'
            : 'Sign in to open the studio and continue your saved work.'}
        </p>

        {errorMsg && (
          <div className="mt-5 rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {isRegistering && (
            <>
              <div>
                <label className="mb-2 block text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#667085]">Username</label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(event) => setFormData({ ...formData, username: event.target.value })}
                  className="w-full rounded-[18px] border border-[#ece2d5] bg-[#faf6f1] px-4 py-3 text-sm text-[#121212] outline-none transition focus:border-[#1f3152] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#667085]">Role</label>
                  <select
                    value={formData.role}
                    onChange={(event) => setFormData({ ...formData, role: event.target.value })}
                    className="w-full rounded-[18px] border border-[#ece2d5] bg-[#faf6f1] px-4 py-3 text-sm text-[#121212] outline-none transition focus:border-[#1f3152] focus:bg-white"
                  >
                    <option value="user">User</option>
                    <option value="tailor">Tailor</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#667085]">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(event) => setFormData({ ...formData, gender: event.target.value })}
                    className="w-full rounded-[18px] border border-[#ece2d5] bg-[#faf6f1] px-4 py-3 text-sm text-[#121212] outline-none transition focus:border-[#1f3152] focus:bg-white"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="mb-2 block text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#667085]">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(event) => setFormData({ ...formData, email: event.target.value })}
              className="w-full rounded-[18px] border border-[#ece2d5] bg-[#faf6f1] px-4 py-3 text-sm text-[#121212] outline-none transition focus:border-[#1f3152] focus:bg-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#667085]">Password</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(event) => setFormData({ ...formData, password: event.target.value })}
              className="w-full rounded-[18px] border border-[#ece2d5] bg-[#faf6f1] px-4 py-3 text-sm text-[#121212] outline-none transition focus:border-[#1f3152] focus:bg-white"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[#121212] px-6 py-4 text-sm font-semibold uppercase tracking-[0.28em] text-white transition hover:bg-[#1f3152] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : isRegistering ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 rounded-[18px] bg-[#f6f0e7]/90 px-4 py-4 text-sm text-[#525d6f]">
          {isRegistering ? 'Already have an account?' : 'Need an account?'}{' '}
          <button
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setErrorMsg('');
            }}
            className="font-semibold text-[#1f3152] transition hover:text-[#121212]"
          >
            {isRegistering ? 'Sign in' : 'Register'}
          </button>
        </div>
      </div>
    </div>
  );
}
