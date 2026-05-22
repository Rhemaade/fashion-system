import { useEffect, useState } from 'react';
import axios from 'axios';
import AppHeader from '../components/AppHeader';
import { useAuth } from '../contexts/AuthContext';

function Card({ title, subtitle, children }) {
  return (
    <section className="rounded-[28px] border border-white/60 bg-white/60 p-5 shadow-[0_18px_50px_rgba(18,18,18,0.07)] backdrop-blur-xl">
      <h2 className="text-[2rem] leading-none text-[#121212]">{title}</h2>
      {subtitle && <p className="mt-2 text-sm leading-7 text-[#525d6f]">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function InfoPill({ label, value }) {
  return (
    <div className="rounded-full border border-white/60 bg-white/75 px-4 py-2 text-xs text-[#525d6f]">
      <span className="mr-2 font-semibold uppercase tracking-[0.2em] text-[#667085]">{label}</span>
      <span className="font-semibold text-[#121212] capitalize">{value}</span>
    </div>
  );
}

export default function Settings() {
  const { user, updateUser, refreshUser } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [gender, setGender] = useState(user?.gender || 'male');
  const [defaultCustomerGender, setDefaultCustomerGender] = useState(user?.defaultCustomerGender || user?.gender || 'male');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setUsername(user?.username || '');
    setGender(user?.gender || 'male');
    setDefaultCustomerGender(user?.defaultCustomerGender || user?.gender || 'male');
  }, [user]);

  useEffect(() => {
    refreshUser().catch((err) => {
      console.error('Failed to refresh profile:', err);
    });
  }, []);

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const payload = {
        username,
        gender,
      };

      if (user?.role === 'tailor') {
        payload.defaultCustomerGender = defaultCustomerGender;
      }

      const response = await axios.patch('/auth/me', payload);
      updateUser(response.data.user);
      setMessage('Profile updated.');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent px-4 py-4 md:px-6">
      <div className="mx-auto max-w-[1280px]">
        <AppHeader
          title="Settings"
          subtitle="Manage your account profile. Tailors can also set a default customer gender for new studio sessions."
          rightSlot={
            <div className="flex flex-wrap gap-2">
              <InfoPill label="Username" value={user?.username || '--'} />
              <InfoPill label="Role" value={user?.role || '--'} />
              <InfoPill label="Gender" value={user?.gender || '--'} />
            </div>
          }
        />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
          <Card
            title="Profile"
            subtitle="Update your visible identity and core account preferences used by the Studio."
          >
            {message && (
              <div className="mb-4 rounded-[20px] border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {message}
              </div>
            )}
            {error && (
              <div className="mb-4 rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#667085]">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="w-full rounded-[18px] border border-[#ece2d5] bg-[#faf6f1] px-4 py-3 text-sm text-[#121212] outline-none transition focus:border-[#1f3152]"
                />
              </div>

              <div>
                <label className="mb-2 block text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#667085]">Email</label>
                <input
                  type="text"
                  value={user?.email || ''}
                  disabled
                  className="w-full rounded-[18px] border border-[#ece2d5] bg-[#f1ebe3] px-4 py-3 text-sm text-[#7b8794]"
                />
              </div>

              <div>
                <label className="mb-2 block text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#667085]">Role</label>
                <input
                  type="text"
                  value={user?.role || ''}
                  disabled
                  className="w-full rounded-[18px] border border-[#ece2d5] bg-[#f1ebe3] px-4 py-3 text-sm capitalize text-[#7b8794]"
                />
              </div>

              <div>
                <label className="mb-2 block text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#667085]">Gender</label>
                <select
                  value={gender}
                  onChange={(event) => setGender(event.target.value)}
                  className="w-full rounded-[18px] border border-[#ece2d5] bg-[#faf6f1] px-4 py-3 text-sm text-[#121212] outline-none transition focus:border-[#1f3152]"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>

            {user?.role === 'tailor' && (
              <div className="mt-5 rounded-[24px] border border-white/60 bg-white/70 p-4">
                <div className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#667085]">Tailor defaults</div>
                <p className="mt-2 text-sm leading-7 text-[#525d6f]">
                  Choose the default customer gender that should be preselected when opening the Studio.
                </p>
                <div className="mt-4 flex gap-2">
                  {['male', 'female'].map((option) => {
                    const active = defaultCustomerGender === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setDefaultCustomerGender(option)}
                        className={`rounded-full px-4 py-2 text-sm font-semibold capitalize transition ${active
                          ? 'bg-[#1f3152] text-white shadow-[0_12px_30px_rgba(31,49,82,0.22)]'
                          : 'bg-[#faf6f1] text-[#525d6f] hover:bg-white hover:text-[#121212]'
                          }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="mt-6 rounded-full bg-[#121212] px-6 py-4 text-sm font-semibold uppercase tracking-[0.26em] text-white transition hover:bg-[#1f3152] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save settings'}
            </button>
          </Card>

          <Card
            title="Current Account"
            subtitle="Read-only account summary used by Atelier flows."
          >
            <div className="space-y-3">
              <InfoPill label="Username" value={user?.username || '--'} />
              <InfoPill label="Role" value={user?.role || '--'} />
              <InfoPill label="Gender" value={user?.gender || '--'} />
              {user?.role === 'tailor' && (
                <InfoPill label="Default customer" value={user?.defaultCustomerGender || '--'} />
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
