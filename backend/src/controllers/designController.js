const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const Replicate = require('replicate');

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});
const {
  GARMENT_CATALOG,
  buildOutfitConfig,
  serializeOutfitConfig,
  deserializeOutfitConfig,
} = require('../services/outfitConfigService');

function sanitizeMeasurements(measurements = {}) {
  const allowedKeys = ['height', 'neck', 'shoulders', 'chest', 'waist', 'hips', 'inseam', 'sleeve'];

  return allowedKeys.reduce((result, key) => {
    const rawValue = measurements[key];
    const numericValue = Number(rawValue);

    if (Number.isFinite(numericValue) && numericValue > 0) {
      result[key] = numericValue;
    }

    return result;
  }, {});
}

function formatMeasurementSegment(measurements) {
  const labelMap = {
    height: 'height',
    neck: 'neck',
    shoulders: 'shoulder width',
    chest: 'chest',
    waist: 'waist',
    hips: 'hips',
    inseam: 'inseam',
    sleeve: 'sleeve length',
  };

  return Object.entries(measurements)
    .map(([key, value]) => `${labelMap[key]} ${value}${key === 'height' ? 'cm' : 'in'}`)
    .join(', ');
}

function extractGeneratedUrl(output) {
  if (Array.isArray(output)) {
    const glbUrl = output.find(url => typeof url === 'string' && url.toLowerCase().endsWith('.glb'));
    if (glbUrl) return glbUrl;
    const objUrl = output.find(url => typeof url === 'string' && url.toLowerCase().endsWith('.obj'));
    if (objUrl) return objUrl;
    return output[0] || null;
  }

  if (typeof output === 'string') {
    return output;
  }

  if (output && typeof output.url === 'function') {
    return output.url();
  }

  return output?.output?.[0] || output?.image || null;
}

function mapGenerationRecord(record) {
  return {
    ...record,
    outfit_config: record.outfit_config || deserializeOutfitConfig(record.render_url),
  };
}

exports.proxyDesignAsset = async (req, res) => {
  try {
    const assetUrl = req.query.url;

    if (!assetUrl) {
      return res.status(400).json({ error: 'Missing asset url' });
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(assetUrl);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid asset url' });
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).json({ error: 'Unsupported asset protocol' });
    }

    const upstreamResponse = await fetch(parsedUrl, {
      headers: {
        'User-Agent': 'VirtualAtelierAssetProxy/1.0',
      },
    });

    if (!upstreamResponse.ok) {
      return res.status(upstreamResponse.status).json({ error: 'Failed to fetch remote asset' });
    }

    const contentType = upstreamResponse.headers.get('content-type') || 'application/octet-stream';
    const arrayBuffer = await upstreamResponse.arrayBuffer();

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.send(Buffer.from(arrayBuffer));
  } catch (error) {
    console.error('Asset proxy error:', error);
    return res.status(500).json({ error: 'Failed to proxy remote asset' });
  }
};

exports.getGarmentCatalog = async (req, res) => {
  return res.status(200).json({ data: GARMENT_CATALOG });
};

exports.generateDesign = async (req, res) => {
  try {
    const { avatar_id, prompt, descriptor, measurements, image } = req.body;
    const userId = req.user.userId; // From JWT Auth Middleware
    const normalizedMeasurements = sanitizeMeasurements(measurements);
    const measurementSegment = formatMeasurementSegment(normalizedMeasurements);
    const outfitConfig = buildOutfitConfig({
      prompt,
      descriptor,
      measurements: normalizedMeasurements,
    });

    // Prompt Formatting Logic
    const engineeredPrompt = [
      `An elegant and high-quality 3D garment model`,
      `Design description: ${prompt}`,
      `Custom tailored for a ${descriptor} body shape`,
      measurementSegment ? `Body measurements: ${measurementSegment}` : null,
      `Luxurious materials, ultra-detailed textures, photorealistic 3D render, high-end fashion design style, soft shadows, 4K, centered on a dark neutral background, perfect drape.`
    ]
      .filter(Boolean)
      .join('. ');

    let generatedModelUrl = null;
    try {
      console.log('Calling Replicate Text-to-3D with prompt:', engineeredPrompt);
      const replicateInput = { prompt: engineeredPrompt };
      if (image) {
        replicateInput.image = image; // Base64 data URI
      }
      
      const output = await replicate.run('tencent/hunyuan-3d-3.1', {
        input: replicateInput
      });
      console.log('Replicate output:', output);
      generatedModelUrl = extractGeneratedUrl(output);
    } catch (err) {
      console.error('Replicate Text-to-3D error:', err);
    }

    const generation = await prisma.generation.create({
      data: {
        user_id: userId,
        avatar_id: avatar_id || null,
        prompt_text: engineeredPrompt,
        texture_url: outfitConfig.primaryColor,
        render_url: generatedModelUrl || serializeOutfitConfig(outfitConfig),
        outfit_config: outfitConfig,
      }
    });

    res.status(200).json({
      message: 'Try-on configuration generated',
      data: mapGenerationRecord(generation),
    });

  } catch (error) {
    console.error("AI Generation Error:", error);
    res.status(500).json({ error: 'Failed to generate design', details: error.message });
  }
};

exports.getUserDesigns = async (req, res) => {
  try {
    const userId = req.user.userId;
    const designs = await prisma.generation.findMany({
      where: { user_id: userId },
      orderBy: { generated_at: 'desc' }
    });
    res.status(200).json({ data: designs.map(mapGenerationRecord) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch designs' });
  }
};
