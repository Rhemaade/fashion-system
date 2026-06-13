import { useEffect, useMemo, useState } from 'react';
import axios from '../utils/api';
import ThreeModel from '../components/ThreeModel';
import { buildMeasurementProfile } from '../utils/logicMapper';
import { useAuth } from '../contexts/AuthContext';
import AppHeader from '../components/AppHeader';

const measurementFields = [
  { key: 'height', label: 'Height', unit: 'cm', min: 140, max: 220, step: 1 },
  { key: 'neck', label: 'Neck', unit: 'in', min: 10, max: 24, step: 0.5 },
  { key: 'shoulders', label: 'Shoulders', unit: 'in', min: 12, max: 28, step: 0.5 },
  { key: 'chest', label: 'Chest / Bust', unit: 'in', min: 24, max: 70, step: 0.5 },
  { key: 'waist', label: 'Waist', unit: 'in', min: 18, max: 60, step: 0.5 },
  { key: 'hips', label: 'Hips', unit: 'in', min: 24, max: 70, step: 0.5 },
  { key: 'inseam', label: 'Inseam', unit: 'in', min: 20, max: 40, step: 0.5 },
  { key: 'sleeve', label: 'Sleeve', unit: 'in', min: 18, max: 32, step: 0.5 },
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

const MAX_GARMENT_PROMPT_LENGTH = 450;

const garmentOptions = ['Suit', 'Dress', 'Blazer', 'Shirt', 'Skirt Set', 'Hoodie'];
const silhouetteOptions = ['fitted', 'tailored', 'relaxed', 'oversized', 'flowing'];
const sleeveOptions = ['sleeveless', 'short', 'three-quarter', 'full'];
const materialOptions = ['cotton', 'linen', 'denim', 'wool', 'silk', 'satin', 'fleece'];

const promptPresets = [
  'Structured navy tailoring with precise shoulders and clean luxury finishing.',
  'Soft ivory draped set with elegant movement and understated premium detailing.',
  'Relaxed charcoal street-luxury silhouette with elevated seam lines and comfort volume.',
];

function SectionCard({ title, subtitle, children }) {
  return (
    <section className="rounded-[26px] border border-white/60 bg-white/60 p-4 shadow-[0_18px_50px_rgba(18,18,18,0.07)] backdrop-blur-xl">
      <div>
        <h2 className="text-[1.8rem] leading-none text-[#121212]">{title}</h2>
        {subtitle && <p className="mt-2 text-sm leading-6 text-[#525d6f]">{subtitle}</p>}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function MetricChip({ label, value }) {
  return (
    <div className="rounded-full border border-white/60 bg-white/70 px-3 py-2 text-xs text-[#525d6f]">
      <span className="mr-2 font-semibold uppercase tracking-[0.18em] text-[#667085]">{label}</span>
      <span className="font-semibold text-[#121212]">{value}</span>
    </div>
  );
}

function SegmentedControl({ label, options, value, onChange, compact = false }) {
  return (
    <div>
      <div className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#667085]">{label}</div>
      <div className={`flex flex-wrap gap-2 ${compact ? 'text-xs' : 'text-sm'}`}>
        {options.map((option) => {
          const active = value === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={`rounded-full px-4 py-2 font-semibold capitalize transition ${
                active
                  ? 'bg-[#1f3152] text-white shadow-[0_12px_30px_rgba(31,49,82,0.22)]'
                  : 'bg-white/75 text-[#525d6f] hover:bg-white hover:text-[#121212]'
              }`}
            >
              {option.replace('-', ' ')}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MeasurementControl({ field, value, onChange }) {
  const normalizedProgress = ((Number(value) - field.min) / (field.max - field.min)) * 100;

  return (
    <div className="rounded-[22px] border border-white/60 bg-white/70 p-3 transition hover:bg-white/85">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[#667085]">{field.label}</div>
          <div className="mt-1 text-lg font-semibold text-[#121212]">
            {value}
            <span className="ml-1 text-xs uppercase tracking-[0.18em] text-[#96a0ad]">{field.unit}</span>
          </div>
        </div>
        <input
          type="number"
          min={field.min}
          max={field.max}
          step={field.step}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-20 rounded-2xl border border-[#e7ddd0] bg-[#f8f4ee] px-3 py-2 text-right text-sm font-semibold text-[#121212] outline-none transition focus:border-[#1f3152]"
        />
      </div>

      <div className="mt-3">
        <input
          type="range"
          min={field.min}
          max={field.max}
          step={field.step}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="atelier-slider"
        />
        <div className="mt-2 h-1.5 rounded-full bg-[#eee6dc]">
          <div className="h-1.5 rounded-full bg-[#1f3152] transition-[width] duration-300" style={{ width: `${Math.max(0, Math.min(normalizedProgress, 100))}%` }} />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [measurements, setMeasurements] = useState(defaultMeasurements);
  const [prompt, setPrompt] = useState('');
  const [descriptor, setDescriptor] = useState('');
  const [fitSummary, setFitSummary] = useState('Balanced proportions');
  const [isGenerating, setIsGenerating] = useState(false);
  const [lookCount, setLookCount] = useState(0);
  const [activeOutfitConfig, setActiveOutfitConfig] = useState(null);
  const [activeModelUrl, setActiveModelUrl] = useState(null);
  const [sketchImage, setSketchImage] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [garmentType, setGarmentType] = useState('Suit');
  const [silhouette, setSilhouette] = useState('tailored');
  const [sleeveLength, setSleeveLength] = useState('full');
  const [material, setMaterial] = useState('wool');
  const [primaryColor, setPrimaryColor] = useState('#1f3152');
  const [accentColor, setAccentColor] = useState('#d8c7af');
  const [details, setDetails] = useState({ embroidery: false, slit: false, belt: false });
  const [targetGender, setTargetGender] = useState(user?.defaultCustomerGender || user?.gender || 'male');
  const [openGroups, setOpenGroups] = useState({
    measurements: true,
    prompt: true,
    styling: true,
  });

  useEffect(() => {
    const profile = buildMeasurementProfile(measurements);
    setFitSummary(profile.fitSummary);
  }, [measurements]);

  useEffect(() => {
    setTargetGender(user?.defaultCustomerGender || user?.gender || 'male');
  }, [user?.defaultCustomerGender, user?.gender]);

  useEffect(() => {
    if (!user?.token) return;

    axios.get('/designs')
      .then((response) => {
        const records = response.data?.data || [];
        setLookCount(records.length);
      })
      .catch((error) => console.error('Failed fetching look count:', error));
  }, [user]);

  const measurementOverview = useMemo(() => {
    return [
      `Height ${measurements.height}cm`,
      `Chest ${measurements.chest}in`,
      `Waist ${measurements.waist}in`,
      `Hips ${measurements.hips}in`,
    ];
  }, [measurements]);

  const currentSummary = activeOutfitConfig || {
    label: 'Studio Preview',
    garmentType,
    silhouette,
    material,
    sleeveLength,
    primaryColor,
    accentColor,
  };
  const effectiveTargetGender = user?.role === 'tailor' ? targetGender : user?.gender || 'male';

  const updateMeasurement = (key, value) => {
    setMeasurements((current) => ({
      ...current,
      [key]: value === '' ? '' : Number(value),
    }));
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) {
      setSketchImage(null);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setSketchImage(reader.result);
    reader.readAsDataURL(file);
  };

  const toggleGroup = (groupKey) => {
    setOpenGroups((current) => ({ ...current, [groupKey]: !current[groupKey] }));
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setErrorMsg('Please describe the garment you want to preview.');
      return;
    }

    if (prompt.trim().length > MAX_GARMENT_PROMPT_LENGTH) {
      setErrorMsg(`Garment prompt must be ${MAX_GARMENT_PROMPT_LENGTH} characters or fewer.`);
      return;
    }

    setIsGenerating(true);
    setErrorMsg('');

    try {
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
        targetGender: effectiveTargetGender,
      });

      const generation = response.data.data;
      setActiveOutfitConfig(generation.outfit_config);
      setActiveModelUrl(generation.render_url);
      setLookCount((current) => current + 1);
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.error || error.response?.data?.details || 'Failed to build try-on preview.';
      setErrorMsg(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent px-4 py-4 md:px-6">
      {isGenerating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#121212]/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[28px] border border-white/30 bg-white/80 p-7 text-center shadow-[0_30px_90px_rgba(18,18,18,0.18)] backdrop-blur-2xl">
            <div className="mx-auto h-14 w-14 rounded-full border-4 border-[#d8c7af]/45 border-t-[#1f3152] animate-spin" />
            <h3 className="mt-5 text-[1.9rem] leading-none text-[#121212]">Generating look</h3>
            <p className="mt-3 text-sm leading-7 text-[#525d6f]">Atelier is building the mannequin render and garment presentation.</p>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[1580px]">
        <AppHeader
          title="Atelier"
          subtitle="Build a look with guided controls. Measurements on the left, garment styling on the right, and the 3D playground at the center."
          rightSlot={
            <div className="flex flex-wrap gap-2">
              <MetricChip label="Looks" value={String(lookCount).padStart(2, '0')} />
              <MetricChip label="Prompt" value={`${prompt.length}/${MAX_GARMENT_PROMPT_LENGTH}`} />
              <MetricChip label="User" value={user?.username || '--'} />
              <MetricChip label="Role" value={user?.role || '--'} />
            </div>
          }
        />

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[320px_minmax(0,1fr)_340px]">
          <aside className="order-2 space-y-5 xl:order-1">
            <SectionCard
              title="Measurements"
              subtitle="Adjust with sliders first, then fine-tune values directly."
            >
              <button
                type="button"
                onClick={() => toggleGroup('measurements')}
                className="mb-4 flex w-full items-center justify-between rounded-[20px] bg-[#f6f0e7] px-4 py-3 text-left text-sm font-semibold text-[#121212] transition hover:bg-[#efe5d7]"
              >
                <span>Body controls</span>
                <span className="text-[#667085]">{openGroups.measurements ? 'Hide' : 'Show'}</span>
              </button>

              <div className={`grid gap-3 overflow-hidden transition-all duration-300 ${openGroups.measurements ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0'}`}>
                {measurementFields.map((field) => (
                  <MeasurementControl
                    key={field.key}
                    field={field}
                    value={measurements[field.key]}
                    onChange={(value) => updateMeasurement(field.key, value)}
                  />
                ))}
              </div>
            </SectionCard>

            <SectionCard
              title="Fit reading"
              subtitle="A quick summary of how the current body proportions are being interpreted."
            >
              <div className="rounded-[22px] border border-[#d8c7af]/70 bg-[#f6f0e7]/90 p-4">
                <div className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#667085]">Current fit notes</div>
                <p className="mt-3 text-sm leading-7 text-[#121212]">{fitSummary}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {measurementOverview.map((item) => (
                  <span key={item} className="rounded-full bg-white/75 px-3 py-2 text-xs font-semibold text-[#525d6f]">
                    {item}
                  </span>
                ))}
              </div>
            </SectionCard>
          </aside>

          <main className="order-1 xl:order-2">
            <div className="rounded-[30px] border border-white/55 bg-white/45 p-4 shadow-[0_24px_80px_rgba(18,18,18,0.09)] backdrop-blur-xl">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-[#667085]">3D Render Playground</div>
                  <h2 className="mt-2 text-[2.6rem] leading-none text-[#121212]">Preview Stage</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <MetricChip label="Type" value={currentSummary.garmentType || '--'} />
                  <MetricChip label="Fabric" value={currentSummary.material || '--'} />
                  <MetricChip label="Shape" value={currentSummary.silhouette || '--'} />
                  <MetricChip label="Avatar" value={effectiveTargetGender} />
                </div>
              </div>

              <ThreeModel
                measurements={measurements}
                outfitConfig={activeOutfitConfig}
                modelUrl={activeModelUrl}
                avatarGender={effectiveTargetGender}
              />

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-[22px] border border-white/60 bg-white/65 p-4">
                  <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#667085]">Active look</div>
                  <div className="mt-2 text-lg font-semibold text-[#121212]">{currentSummary.label}</div>
                  <div className="mt-1 text-sm capitalize text-[#525d6f]">{currentSummary.sleeveLength || '--'} sleeves</div>
                </div>
                <div className="rounded-[22px] border border-white/60 bg-white/65 p-4">
                  <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#667085]">Color palette</div>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="h-10 w-10 rounded-full border border-white/70" style={{ backgroundColor: currentSummary.primaryColor || primaryColor }} />
                    <span className="h-10 w-10 rounded-full border border-white/70" style={{ backgroundColor: currentSummary.accentColor || accentColor }} />
                  </div>
                </div>
                <div className="rounded-[22px] border border-white/60 bg-white/65 p-4">
                  <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#667085]">Saved looks</div>
                  <div className="mt-2 text-lg font-semibold text-[#121212]">{lookCount}</div>
                  <div className="mt-1 text-sm text-[#525d6f]">Open the Saved Looks page to review and replay them.</div>
                </div>
              </div>
            </div>
          </main>

          <aside className="order-3 space-y-5">
            <SectionCard
              title="Garment Brief"
              subtitle="Use guided selectors instead of dense forms. Start broad, then refine."
            >
              {errorMsg && (
                <div className="mb-4 rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMsg}
                </div>
              )}

              <button
                type="button"
                onClick={() => toggleGroup('styling')}
                className="mb-4 flex w-full items-center justify-between rounded-[20px] bg-[#f6f0e7] px-4 py-3 text-left text-sm font-semibold text-[#121212] transition hover:bg-[#efe5d7]"
              >
                <span>Styling controls</span>
                <span className="text-[#667085]">{openGroups.styling ? 'Hide' : 'Show'}</span>
              </button>

              <div className={`space-y-4 overflow-hidden transition-all duration-300 ${openGroups.styling ? 'max-h-[1600px] opacity-100' : 'max-h-0 opacity-0'}`}>
                {user?.role === 'tailor' && (
                  <SegmentedControl
                    label="Customer gender"
                    options={['male', 'female']}
                    value={targetGender}
                    onChange={setTargetGender}
                    compact
                  />
                )}
                <SegmentedControl label="Garment type" options={garmentOptions} value={garmentType} onChange={setGarmentType} />
                <SegmentedControl label="Silhouette" options={silhouetteOptions} value={silhouette} onChange={setSilhouette} compact />
                <SegmentedControl label="Sleeve length" options={sleeveOptions} value={sleeveLength} onChange={setSleeveLength} compact />
                <SegmentedControl label="Material" options={materialOptions} value={material} onChange={setMaterial} compact />

                <div>
                  <div className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#667085]">Design details</div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'embroidery', label: 'Embroidery' },
                      { key: 'slit', label: 'Slit' },
                      { key: 'belt', label: 'Belt' },
                    ].map((option) => {
                      const active = details[option.key];
                      return (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => setDetails((current) => ({ ...current, [option.key]: !current[option.key] }))}
                          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                            active ? 'bg-[#121212] text-white' : 'bg-white/75 text-[#525d6f] hover:bg-white hover:text-[#121212]'
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="rounded-[20px] border border-white/60 bg-white/70 p-3">
                    <div className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#667085]">Primary color</div>
                    <input type="color" value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} className="mt-3 h-11 w-full cursor-pointer rounded-2xl border border-[#ece2d5] bg-transparent p-1" />
                  </label>
                  <label className="rounded-[20px] border border-white/60 bg-white/70 p-3">
                    <div className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#667085]">Accent color</div>
                    <input type="color" value={accentColor} onChange={(event) => setAccentColor(event.target.value)} className="mt-3 h-11 w-full cursor-pointer rounded-2xl border border-[#ece2d5] bg-transparent p-1" />
                  </label>
                </div>
              </div>

              <button
                type="button"
                onClick={() => toggleGroup('prompt')}
                className="mb-4 mt-5 flex w-full items-center justify-between rounded-[20px] bg-[#1f3152] px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-[#16243c]"
              >
                <span>Prompt brief</span>
                <span className="text-white/70">{openGroups.prompt ? 'Hide' : 'Show'}</span>
              </button>

              <div className={`space-y-4 overflow-hidden transition-all duration-300 ${openGroups.prompt ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="rounded-[22px] border border-white/60 bg-white/70 p-4">
                  <div className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#667085]">Body descriptor</div>
                  <input
                    type="text"
                    value={descriptor}
                    onChange={(event) => setDescriptor(event.target.value)}
                    placeholder="Athletic, elongated, hourglass, relaxed..."
                    className="mt-3 w-full rounded-[18px] border border-[#ece2d5] bg-[#faf6f1] px-4 py-3 text-sm text-[#121212] outline-none transition focus:border-[#1f3152]"
                  />
                </div>

                <div className="rounded-[22px] border border-white/60 bg-white/70 p-4">
                  <div className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#667085]">Garment description</div>
                  <textarea
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    maxLength={MAX_GARMENT_PROMPT_LENGTH}
                    placeholder="Describe the garment, finish, silhouette mood and key styling intent."
                    className="mt-3 h-32 w-full resize-none rounded-[18px] border border-[#ece2d5] bg-[#faf6f1] px-4 py-3 text-sm leading-7 text-[#121212] outline-none transition focus:border-[#1f3152]"
                  />
                  <div className="mt-3 flex items-center justify-between text-xs text-[#667085]">
                    <span>Reserved prompt space remains for mannequin and fit instructions.</span>
                    <span>{prompt.length}/{MAX_GARMENT_PROMPT_LENGTH}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {promptPresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setPrompt(preset)}
                      className="rounded-full bg-white/75 px-4 py-2 text-xs font-semibold text-[#525d6f] transition hover:bg-white hover:text-[#121212]"
                    >
                      Use preset
                    </button>
                  ))}
                </div>

                <div className="rounded-[22px] border border-dashed border-[#d8c7af] bg-[#f6f0e7]/80 p-4">
                  <div className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#667085]">Reference sketch</div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="mt-3 w-full text-sm text-[#525d6f] file:mr-4 file:rounded-full file:border-0 file:bg-[#121212] file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-[#1f3152]"
                  />
                  {sketchImage && <img src={sketchImage} alt="Sketch preview" className="mt-4 h-24 w-full rounded-[18px] object-cover" />}
                </div>

              </div>
            </SectionCard>
            <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full rounded-full bg-[#121212] px-6 py-4 text-sm font-semibold uppercase tracking-[0.28em] text-white transition hover:bg-[#1f3152] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isGenerating ? 'Generating...' : 'Generate Look'}
              </button>
          </aside>
        </div>
      </div>
    </div>
  );
}
