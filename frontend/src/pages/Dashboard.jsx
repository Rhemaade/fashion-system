import { useEffect, useState } from 'react';
import axios from 'axios';
import ThreeModel from '../components/ThreeModel';
import { buildMeasurementProfile } from '../utils/logicMapper';
import { useAuth } from '../contexts/AuthContext';

const measurementFields = [
  { key: 'height', label: 'Height', unit: 'cm', min: 140, max: 220 },
  { key: 'neck', label: 'Neck', unit: 'in', min: 10, max: 24 },
  { key: 'shoulders', label: 'Shoulders', unit: 'in', min: 12, max: 28 },
  { key: 'chest', label: 'Chest/Bust', unit: 'in', min: 24, max: 70 },
  { key: 'waist', label: 'Waist', unit: 'in', min: 18, max: 60 },
  { key: 'hips', label: 'Hips', unit: 'in', min: 24, max: 70 },
  { key: 'inseam', label: 'Inseam', unit: 'in', min: 20, max: 40 },
  { key: 'sleeve', label: 'Sleeve', unit: 'in', min: 18, max: 32 },
];

const defaultMeasurements = {
  height: 170,
  neck: 14,
  shoulders: 17,
  chest: 38,
  waist: 30,
  hips: 40,
  inseam: 31,
  sleeve: 24,
};



function HistoryCard({ item, isActive, onSelect }) {
  const config = item.outfit_config;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-xl border p-4 text-left transition-all ${isActive ? 'border-stone-900 bg-stone-900 text-white shadow-lg' : 'border-stone-200 bg-white hover:border-stone-400'
        }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">{config?.label || 'Saved Look'}</p>
          <p className={`text-xs ${isActive ? 'text-stone-300' : 'text-stone-500'}`}>{config?.silhouette || 'tailored'} silhouette</p>
        </div>
        <div className="flex gap-2">
          <span className="h-5 w-5 rounded-full border border-black/10" style={{ backgroundColor: config?.primaryColor || '#d6d3d1' }} />
          <span className="h-5 w-5 rounded-full border border-black/10" style={{ backgroundColor: config?.accentColor || '#f8fafc' }} />
        </div>
      </div>
      <p className={`mt-3 text-xs leading-5 ${isActive ? 'text-stone-200' : 'text-stone-600'}`}>{item.prompt_text}</p>
    </button>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [measurements, setMeasurements] = useState(defaultMeasurements);
  const [prompt, setPrompt] = useState('');
  const [descriptor, setDescriptor] = useState('');
  const [fitSummary, setFitSummary] = useState('balanced proportions');
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState([]);
  const [activeGenerationId, setActiveGenerationId] = useState(null);
  const [activeOutfitConfig, setActiveOutfitConfig] = useState(null);
  const [activeModelUrl, setActiveModelUrl] = useState(null);
  const [sketchImage, setSketchImage] = useState(null);

  // Explicit Garment Properties
  const [garmentType, setGarmentType] = useState('Suit');
  const [silhouette, setSilhouette] = useState('tailored');
  const [sleeveLength, setSleeveLength] = useState('full');
  const [material, setMaterial] = useState('wool');
  const [primaryColor, setPrimaryColor] = useState('#1e3a8a');
  const [accentColor, setAccentColor] = useState('#fbbf24');
  const [details, setDetails] = useState({ embroidery: false, slit: false, belt: false });

  useEffect(() => {
    const profile = buildMeasurementProfile(measurements);
    setFitSummary(profile.fitSummary);
  }, [measurements]);

  useEffect(() => {
    if (!user?.token) return;

    if (!user?.token) return;

    axios.get('/designs')
      .then((res) => {
        const records = res.data?.data || [];
        setHistory(records);
        if (records.length > 0) {
          setActiveGenerationId(records[0].id);
          setActiveOutfitConfig(records[0].outfit_config);
          setActiveModelUrl(records[0].render_url);
        }
      })
      .catch((error) => console.error('Failed fetching history:', error));
  }, [user]);

  const updateMeasurement = (key, value) => {
    setMeasurements((current) => ({
      ...current,
      [key]: value === '' ? '' : Number(value),
    }));
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSketchImage(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setSketchImage(null);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      alert('Please describe the garment you want to preview.');
      return;
    }

    setIsGenerating(true);

    const response = await axios.post('/designs/generate', {
      prompt,
      descriptor,
      measurements,
      image: sketchImage,
      garmentType,
      silhouette,
      sleeveLength,
      material,
      primaryColor,
      accentColor,
      detailFlags: details,
    });
    try {
      const generation = response.data.data;
      setHistory((current) => [generation, ...current]);
      setActiveGenerationId(generation.id);
      setActiveOutfitConfig(generation.outfit_config);
      setActiveModelUrl(generation.render_url);
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.error || 'Failed to build try-on preview.');
    } finally {
      setIsGenerating(false);
    }
  };

  const selectHistoryItem = (item) => {
    setActiveGenerationId(item.id);
    setActiveOutfitConfig(item.outfit_config);
    setActiveModelUrl(item.render_url);
  };



  return (
    <div className="min-h-screen bg-[#f3efe7] px-4 py-6 md:px-8">
      <header className="mb-8 flex flex-col gap-4 rounded-3xl border border-stone-200 bg-white px-6 py-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">RHEMS UNISEX MVP</p>
          <h1 className="mt-2 text-3xl font-bold text-stone-900">3D Try-On Studio</h1>
          <p className="mt-2 max-w-2xl text-sm text-stone-600">
            Measurements drive a neutral avatar form. The prompt resolves into a local garment configuration for a unisex 3D try-on preview.
          </p>
        </div>
        <div className="rounded-2xl bg-stone-900 px-4 py-3 text-sm text-stone-100">
          <div className="font-semibold">Signed in</div>
          <div className="mt-1 text-xs text-stone-300">{user?.id}</div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-stone-900">Body Measurements</h2>
                <p className="mt-1 text-sm text-stone-500">These values shape the base avatar proportions without requiring a gender-specific pipeline.</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
              {measurementFields.map((field) => (
                <label key={field.key} className="block">
                  <span className="mb-1 block text-sm font-medium text-stone-700">
                    {field.label} ({field.unit})
                  </span>
                  <input
                    type="number"
                    min={field.min}
                    max={field.max}
                    value={measurements[field.key]}
                    onChange={(event) => updateMeasurement(field.key, event.target.value)}
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none transition focus:border-stone-900 focus:ring-2 focus:ring-stone-200"
                  />
                </label>
              ))}
            </div>

            <div className="mt-5 rounded-2xl bg-stone-100 p-4 text-sm text-stone-700">
              <div className="font-semibold text-stone-900">Fit notes</div>
              <p className="mt-2">{fitSummary}</p>
            </div>
          </section>

          <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-stone-900">Garment Intent</h2>
            <p className="mt-1 text-sm text-stone-500">Provide a detailed description of the garment and optionally upload a reference sketch.</p>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-stone-700">Garment Type</label>
              <input
                type="text"
                value={garmentType}
                onChange={(e) => setGarmentType(e.target.value)}
                placeholder="e.g. Double-breasted jacket, Evening gown..."
                className="w-full rounded-xl border border-stone-300 px-4 py-2 text-sm outline-none transition focus:border-stone-900 focus:ring-2 focus:ring-stone-200"
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700">Silhouette</label>
                <select value={silhouette} onChange={(e) => setSilhouette(e.target.value)} className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none transition focus:border-stone-900">
                  <option value="fitted">Fitted</option>
                  <option value="tailored">Tailored</option>
                  <option value="relaxed">Relaxed</option>
                  <option value="oversized">Oversized</option>
                  <option value="flowing">Flowing</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700">Sleeve Length</label>
                <select value={sleeveLength} onChange={(e) => setSleeveLength(e.target.value)} className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none transition focus:border-stone-900">
                  <option value="sleeveless">Sleeveless</option>
                  <option value="short">Short</option>
                  <option value="three-quarter">3/4 Length</option>
                  <option value="full">Full</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700">Material</label>
                <select value={material} onChange={(e) => setMaterial(e.target.value)} className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none transition focus:border-stone-900">
                  <option value="cotton">Cotton</option>
                  <option value="linen">Linen</option>
                  <option value="denim">Denim</option>
                  <option value="wool">Wool</option>
                  <option value="silk">Silk</option>
                  <option value="satin">Satin</option>
                  <option value="fleece">Fleece</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700">Colors</label>
                <div className="flex gap-2">
                  <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-9 w-1/2 cursor-pointer rounded border border-stone-300 bg-white p-1" title="Primary Color" />
                  <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="h-9 w-1/2 cursor-pointer rounded border border-stone-300 bg-white p-1" title="Accent Color" />
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-4">
              <label className="flex items-center gap-2 text-sm text-stone-700">
                <input type="checkbox" checked={details.embroidery} onChange={(e) => setDetails({ ...details, embroidery: e.target.checked })} className="rounded text-stone-900 focus:ring-stone-900" />
                Embroidery
              </label>
              <label className="flex items-center gap-2 text-sm text-stone-700">
                <input type="checkbox" checked={details.slit} onChange={(e) => setDetails({ ...details, slit: e.target.checked })} className="rounded text-stone-900 focus:ring-stone-900" />
                Slit
              </label>
              <label className="flex items-center gap-2 text-sm text-stone-700">
                <input type="checkbox" checked={details.belt} onChange={(e) => setDetails({ ...details, belt: e.target.checked })} className="rounded text-stone-900 focus:ring-stone-900" />
                Belt
              </label>
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-stone-700">Body Descriptor</label>
              <input
                type="text"
                value={descriptor}
                onChange={(e) => setDescriptor(e.target.value)}
                placeholder="e.g. Athletic, Plus Size, Hourglass..."
                className="w-full rounded-xl border border-stone-300 px-4 py-2 text-sm outline-none transition focus:border-stone-900 focus:ring-2 focus:ring-stone-200"
              />
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-stone-700">Garment Prompt</label>
              <textarea
                className="h-32 w-full resize-none rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-stone-900 focus:ring-2 focus:ring-stone-200"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="e.g. A tailored double-breasted suit jacket in navy blue wool with gold buttons and structured shoulders..."
              />
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-stone-700">Optional: Upload a sketch or reference image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full text-sm text-stone-500 file:mr-4 file:rounded-xl file:border-0 file:bg-stone-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-stone-700 hover:file:bg-stone-200"
              />
              {sketchImage && (
                <div className="mt-3">
                  <img src={sketchImage} alt="Sketch preview" className="h-24 w-24 rounded-lg object-cover border border-stone-200" />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="mt-4 w-full rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-400"
            >
              {isGenerating ? 'Generating Try-On Configuration...' : 'Generate 3D Try-On Look'}
            </button>
          </section>
        </aside>

        <main className="space-y-6">
          <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-stone-900">Live Outfit Preview</h2>
                <p className="mt-1 text-sm text-stone-500">
                  This MVP renders a measurement-shaped avatar and a local garment mesh driven by the generated unisex outfit config.
                </p>
              </div>
              {activeOutfitConfig && (
                <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
                  <div className="font-semibold text-stone-900">{activeOutfitConfig.label}</div>
                  <div className="mt-1">
                    {activeOutfitConfig.silhouette} | {activeOutfitConfig.material} | {activeOutfitConfig.sleeveLength}
                  </div>
                </div>
              )}
            </div>
            <ThreeModel measurements={measurements} outfitConfig={activeOutfitConfig} modelUrl={activeModelUrl} />
          </section>

          <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-stone-900">Saved Looks</h2>
                <p className="mt-1 text-sm text-stone-500">Each saved item stores an outfit config that can be replayed on the current avatar.</p>
              </div>
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-400">
                {history.length} looks
              </div>
            </div>

            {history.length > 0 ? (
              <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
                {history.map((item) => (
                  <HistoryCard
                    key={item.id}
                    item={item}
                    isActive={item.id === activeGenerationId}
                    onSelect={() => selectHistoryItem(item)}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-6 text-sm text-stone-500">
                No saved looks yet. Generate your first outfit configuration to populate history.
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
