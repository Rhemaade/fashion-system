import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext'; // Brought back!
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/superbaseClient'; // Adjust path as needed
import api from '../utils/api'; // Assuming you kept the Axios interceptor for the /sync route

export default function Login() {
  const { login } = useAuth(); // Hooking back into your global state
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

  // Helper function to format Supabase user data into what your Context expects
  const mapSupabaseUser = (supabaseUser) => {
    return {
      id: supabaseUser.id,
      email: supabaseUser.email,
      username: supabaseUser.user_metadata?.username,
      role: supabaseUser.user_metadata?.role || 'user',
      gender: supabaseUser.user_metadata?.gender || 'male',
    };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (isRegistering) {
        // --- 1. SUPABASE SIGN UP ---
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              username: formData.username,
              role: formData.role,
              gender: formData.gender,
            }
          }
        });

        if (error) throw error;
        
        if (data.session) {
          // --- 2. SYNC & UPDATE CONTEXT ---
          await api.post('/auth/sync'); 
          
          // Inject into your AuthContext
          const formattedUser = mapSupabaseUser(data.user);
          login(data.session.access_token, formattedUser);
          
          navigate('/dashboard');
        } else {
          setErrorMsg('Registration successful! Please check your email to confirm your account.');
        }

      } else {
        // --- 1. SUPABASE LOG IN ---
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;
        
        // --- 2. SYNC & UPDATE CONTEXT ---
        await api.post('/auth/sync');

        // Inject into your AuthContext
        const formattedUser = mapSupabaseUser(data.user);
        login(data.session.access_token, formattedUser);
        
        navigate('/dashboard');
      }
    } catch (error) {
      console.error(error);
      setErrorMsg(error.message || 'An error occurred during authentication.');
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
          <div className={`mt-5 rounded-[20px] border px-4 py-3 text-sm ${
            errorMsg.includes('successful') 
              ? 'border-green-200 bg-green-50 text-green-700' 
              : 'border-red-200 bg-red-50 text-red-700'
          }`}>
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