import { useState } from 'react';
import { supabase } from '../utils/superbaseClient';
import { useNavigate } from 'react-router-dom';

export default function UpdatePassword() {
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleUpdatePassword = async (event) => {
    event.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      // Because they clicked the email link, they have a secure session to do this:
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setMessage('Password updated successfully! Redirecting...');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (error) {
      console.error(error);
      setErrorMsg(error.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-[30px] border border-white/60 bg-white/72 p-8 shadow-[0_28px_80px_rgba(18,18,18,0.1)] backdrop-blur-xl">
        <div className="text-[0.72rem] font-semibold uppercase tracking-[0.34em] text-[#667085]">Atelier</div>
        <h1 className="mt-4 text-[3rem] leading-none text-[#121212]">New Password</h1>
        
        {errorMsg && (
          <div className="mt-5 rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {message && (
          <div className="mt-5 rounded-[20px] border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {message}
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#667085]">Enter New Password</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-[18px] border border-[#ece2d5] bg-[#faf6f1] px-4 py-3 text-sm text-[#121212] outline-none transition focus:border-[#1f3152] focus:bg-white"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[#121212] px-6 py-4 text-sm font-semibold uppercase tracking-[0.28em] text-white transition hover:bg-[#1f3152] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}