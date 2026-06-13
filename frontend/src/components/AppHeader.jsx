import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/superbaseClient'; // Adjust path if needed

function NavPill({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] transition ${
          isActive
            ? 'bg-[#121212] text-white shadow-[0_16px_36px_rgba(18,18,18,0.18)]'
            : 'bg-white/70 text-[#525d6f] hover:bg-white hover:text-[#121212]'
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export default function AppHeader({ title, subtitle, rightSlot }) {
  // Pulling in navigation and your AuthContext
  const navigate = useNavigate();
  const { logout } = useAuth(); // Assuming your AuthContext has a logout function

  const handleLogout = async () => {
    try {
      // 1. Tell Supabase to securely kill the session in the cloud and local storage
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // 2. Clear your global React state
      if (logout) logout(); 

      // 3. Send them back to the login page
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error.message);
    }
  };

  return (
    <header className="mb-5 rounded-[28px] border border-white/55 bg-white/55 px-5 py-4 shadow-[0_20px_60px_rgba(18,18,18,0.08)] backdrop-blur-xl">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-[#667085]">Atelier</div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-[2.6rem] leading-none text-[#121212] md:text-[3rem]">{title}</h1>
            <nav className="flex flex-wrap gap-2">
              <NavPill to="/dashboard">Studio</NavPill>
              <NavPill to="/looks">Saved Looks</NavPill>
              <NavPill to="/settings">Settings</NavPill>
              
              {/* Added Logout Button styled similarly to NavPills but with a subtle destructive hover */}
              <NavLink
                onClick={handleLogout}
                className="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] transition bg-white/70 text-[#525d6f] hover:bg-red-50 hover:text-red-600"
              >
                Logout
              </NavLink>
            </nav>
          </div>
          {subtitle && <p className="mt-3 max-w-3xl text-sm leading-7 text-[#525d6f]">{subtitle}</p>}
        </div>

        {rightSlot}
      </div>
    </header>
  );
}