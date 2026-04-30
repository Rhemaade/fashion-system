const GARMENT_CATALOG = [
  {
    id: 'tailored-suit',
    label: 'Tailored Suit',
    garmentType: 'separates',
    styleProfile: 'unisex-tailored',
    silhouette: 'tailored',
    topLength: 'hip',
    bottomLength: 'ankle',
    sleeveLength: 'long',
    material: 'wool',
    color: '#1f3a5f',
    accentColor: '#d4b483',
  },
  {
    id: 'senator-set',
    label: 'Senator Set',
    garmentType: 'separates',
    styleProfile: 'unisex-cultural',
    silhouette: 'relaxed',
    topLength: 'mid-thigh',
    bottomLength: 'ankle',
    sleeveLength: 'long',
    material: 'cotton',
    color: '#f3f0e8',
    accentColor: '#8f5a2a',
  },
  {
    id: 'evening-gown',
    label: 'Formal Draped Look',
    garmentType: 'dress',
    styleProfile: 'unisex-formal',
    silhouette: 'flowing',
    topLength: 'waist',
    bottomLength: 'floor',
    sleeveLength: 'sleeveless',
    material: 'satin',
    color: '#28536b',
    accentColor: '#d9bf77',
  },
  {
    id: 'casual-hoodie',
    label: 'Casual Hoodie',
    garmentType: 'separates',
    styleProfile: 'unisex-streetwear',
    silhouette: 'oversized',
    topLength: 'hip',
    bottomLength: 'ankle',
    sleeveLength: 'long',
    material: 'fleece',
    color: '#6b7280',
    accentColor: '#111827',
  },
];

const COLOR_KEYWORDS = [
  ['black', '#1f2933'],
  ['white', '#f8fafc'],
  ['cream', '#f4efe1'],
  ['navy', '#213555'],
  ['blue', '#2563eb'],
  ['red', '#b91c1c'],
  ['green', '#166534'],
  ['emerald', '#047857'],
  ['gold', '#c99700'],
  ['brown', '#7c4f2c'],
  ['pink', '#db2777'],
  ['purple', '#6d28d9'],
  ['gray', '#6b7280'],
  ['grey', '#6b7280'],
];

const ACCENT_KEYWORDS = [
  ['gold', '#d4af37'],
  ['silver', '#b8c0cc'],
  ['bronze', '#9f6b38'],
  ['black', '#111827'],
  ['white', '#f8fafc'],
];

function inferCatalogItem(promptText) {
  const prompt = promptText.toLowerCase();

  if (prompt.includes('senator')) return GARMENT_CATALOG.find((item) => item.id === 'senator-set');
  if (prompt.includes('gown') || prompt.includes('dress')) return GARMENT_CATALOG.find((item) => item.id === 'evening-gown');
  if (prompt.includes('hoodie') || prompt.includes('streetwear')) return GARMENT_CATALOG.find((item) => item.id === 'casual-hoodie');
  return GARMENT_CATALOG.find((item) => item.id === 'tailored-suit');
}

function inferColor(promptText, list, fallback) {
  const prompt = promptText.toLowerCase();
  const match = list.find(([keyword]) => prompt.includes(keyword));
  return match ? match[1] : fallback;
}

function inferSleeveLength(promptText, fallback) {
  const prompt = promptText.toLowerCase();
  if (prompt.includes('sleeveless')) return 'sleeveless';
  if (prompt.includes('short sleeve') || prompt.includes('short-sleeve')) return 'short';
  if (prompt.includes('three quarter')) return 'three-quarter';
  return fallback;
}

function inferSilhouette(promptText, fallback) {
  const prompt = promptText.toLowerCase();
  if (prompt.includes('oversized') || prompt.includes('loose')) return 'oversized';
  if (prompt.includes('flowing') || prompt.includes('flared')) return 'flowing';
  if (prompt.includes('fitted') || prompt.includes('slim')) return 'fitted';
  if (prompt.includes('tailored') || prompt.includes('structured')) return 'tailored';
  return fallback;
}

function inferMaterial(promptText, fallback) {
  const prompt = promptText.toLowerCase();
  if (prompt.includes('wool')) return 'wool';
  if (prompt.includes('cotton')) return 'cotton';
  if (prompt.includes('satin')) return 'satin';
  if (prompt.includes('linen')) return 'linen';
  if (prompt.includes('denim')) return 'denim';
  if (prompt.includes('silk')) return 'silk';
  return fallback;
}

function inferDetailFlags(promptText) {
  const prompt = promptText.toLowerCase();
  return {
    embroidery: prompt.includes('embroidery') || prompt.includes('embroidered'),
    belt: prompt.includes('belt'),
    slit: prompt.includes('slit'),
    pockets: prompt.includes('pocket'),
    layered: prompt.includes('layered'),
  };
}

function buildOutfitConfig({ prompt, descriptor, measurements }) {
  const baseItem = inferCatalogItem(prompt);
  const promptColor = inferColor(prompt, COLOR_KEYWORDS, baseItem.color);
  const accentColor = inferColor(prompt, ACCENT_KEYWORDS, baseItem.accentColor);
  const silhouette = inferSilhouette(prompt, baseItem.silhouette);
  const sleeveLength = inferSleeveLength(prompt, baseItem.sleeveLength);
  const material = inferMaterial(prompt, baseItem.material);
  const detailFlags = inferDetailFlags(prompt);

  return {
    version: 'mvp-3d-tryon',
    catalogId: baseItem.id,
    label: baseItem.label,
    garmentType: baseItem.garmentType,
    styleProfile: baseItem.styleProfile,
    silhouette,
    sleeveLength,
    topLength: baseItem.topLength,
    bottomLength: baseItem.bottomLength,
    material,
    primaryColor: promptColor,
    accentColor,
    bodyDescriptor: descriptor,
    detailFlags,
    measurements,
  };
}

function serializeOutfitConfig(config) {
  return JSON.stringify(config);
}

function deserializeOutfitConfig(rawConfig) {
  if (!rawConfig) return null;

  try {
    const parsed = JSON.parse(rawConfig);
    return parsed?.version === 'mvp-3d-tryon' ? parsed : null;
  } catch (error) {
    return null;
  }
}

module.exports = {
  GARMENT_CATALOG,
  buildOutfitConfig,
  serializeOutfitConfig,
  deserializeOutfitConfig,
};
