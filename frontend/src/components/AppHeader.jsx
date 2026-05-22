import { NavLink } from 'react-router-dom';

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
            </nav>
          </div>
          {subtitle && <p className="mt-3 max-w-3xl text-sm leading-7 text-[#525d6f]">{subtitle}</p>}
        </div>

        {rightSlot}
      </div>
    </header>
  );
}
