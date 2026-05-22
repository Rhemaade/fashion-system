import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import ThreeModel from '../components/ThreeModel';
import { useAuth } from '../contexts/AuthContext';
import AppHeader from '../components/AppHeader';

function LookListItem({ item, isActive, onClick }) {
  const config = item.outfit_config;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[22px] border p-4 text-left transition ${
        isActive
          ? 'border-[#1f3152] bg-[#1f3152] text-white shadow-[0_16px_32px_rgba(31,49,82,0.24)]'
          : 'border-white/60 bg-white/70 text-[#121212] hover:bg-white'
      }`}
    >
      <div className="text-sm font-semibold">{config?.label || config?.garmentType || 'Saved Look'}</div>
      <div className={`mt-1 text-xs ${isActive ? 'text-white/70' : 'text-[#667085]'}`}>
        {item.generated_at ? new Date(item.generated_at).toLocaleDateString() : 'Just now'}
      </div>
      <div className={`mt-4 flex flex-wrap gap-2 text-[0.68rem] ${isActive ? 'text-white/75' : 'text-[#667085]'}`}>
        <span className="rounded-full bg-black/8 px-3 py-1.5 capitalize">{config?.garmentType || '--'}</span>
        <span className="rounded-full bg-black/8 px-3 py-1.5 capitalize">{config?.silhouette || '--'}</span>
      </div>
    </button>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-[22px] border border-white/60 bg-white/70 p-4">
      <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#667085]">{label}</div>
      <div className="mt-2 text-base font-semibold capitalize text-[#121212]">{value || '--'}</div>
    </div>
  );
}

export default function Looks() {
  const { user } = useAuth();
  const [looks, setLooks] = useState([]);
  const [activeLookId, setActiveLookId] = useState(null);

  useEffect(() => {
    if (!user?.token) return;

    axios.get('/designs')
      .then((response) => {
        const records = response.data?.data || [];
        setLooks(records);
        if (records[0]) {
          setActiveLookId(records[0].id);
        }
      })
      .catch((error) => console.error('Failed fetching saved looks:', error));
  }, [user]);

  const activeLook = useMemo(
    () => looks.find((item) => item.id === activeLookId) || null,
    [activeLookId, looks],
  );

  return (
    <div className="min-h-screen bg-transparent px-4 py-4 md:px-6">
      <div className="mx-auto max-w-[1580px]">
        <AppHeader
          title="Saved Looks"
          subtitle="Browse generated looks from the left pane and inspect the 3D mannequin render on the right."
          rightSlot={
            <div className="rounded-full border border-white/60 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#525d6f]">
              {looks.length} saved
            </div>
          }
        />

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="rounded-[28px] border border-white/60 bg-white/60 p-4 shadow-[0_18px_50px_rgba(18,18,18,0.07)] backdrop-blur-xl">
            <div className="mb-4">
              <h2 className="text-[2rem] leading-none text-[#121212]">Look list</h2>
              <p className="mt-2 text-sm leading-6 text-[#525d6f]">Select any saved look to open it in the viewer.</p>
            </div>

            <div className="atelier-scroll max-h-[72vh] space-y-3 overflow-y-auto pr-1">
              {looks.length > 0 ? (
                looks.map((item) => (
                  <LookListItem
                    key={item.id}
                    item={item}
                    isActive={item.id === activeLookId}
                    onClick={() => setActiveLookId(item.id)}
                  />
                ))
              ) : (
                <div className="rounded-[22px] border border-dashed border-[#d8c7af] bg-[#f6f0e7]/80 px-4 py-6 text-sm text-[#525d6f]">
                  No saved looks yet. Generate one from the Studio page first.
                </div>
              )}
            </div>
          </aside>

          <main className="rounded-[28px] border border-white/60 bg-white/50 p-4 shadow-[0_22px_70px_rgba(18,18,18,0.08)] backdrop-blur-xl">
            {activeLook ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-[#667085]">3D render playground</div>
                    <h2 className="mt-2 text-[2.6rem] leading-none text-[#121212]">{activeLook.outfit_config?.label || 'Saved Look'}</h2>
                  </div>
                  <div className="rounded-full bg-[#1f3152] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white">
                    Firebase GLB
                  </div>
                </div>

                <ThreeModel
                  measurements={defaultMeasurementsForLooks()}
                  outfitConfig={activeLook.outfit_config}
                  modelUrl={activeLook.render_url}
                  avatarGender={activeLook.outfit_config?.targetGender || 'male'}
                />

                <div className="grid gap-3 md:grid-cols-4">
                  <InfoCard label="Garment" value={activeLook.outfit_config?.garmentType} />
                  <InfoCard label="Silhouette" value={activeLook.outfit_config?.silhouette} />
                  <InfoCard label="Material" value={activeLook.outfit_config?.material} />
                  <InfoCard label="Sleeve" value={activeLook.outfit_config?.sleeveLength} />
                </div>

                <div className="rounded-[22px] border border-white/60 bg-white/70 p-4">
                  <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#667085]">Generation prompt</div>
                  <p className="mt-3 text-sm leading-7 text-[#121212]">{activeLook.prompt_text}</p>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[65vh] items-center justify-center rounded-[24px] border border-dashed border-[#d8c7af] bg-[#f6f0e7]/80 text-center text-sm text-[#525d6f]">
                Select a saved look from the left pane to open the 3D render playground.
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function defaultMeasurementsForLooks() {
  return {
    height: 170,
    neck: 14,
    shoulders: 17,
    chest: 38,
    waist: 30,
    hips: 40,
    inseam: 31,
    sleeve: 24,
  };
}
