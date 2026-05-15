const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const Replicate = require('replicate');
const { randomUUID } = require('crypto');
const { uploadRemoteAssetToFirebase, uploadReplicateOutputToFirebase } = require('../utils/firebaseUpload');

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const MAX_REPLICATE_PROMPT_LENGTH = 1024;
const MAX_GARMENT_DESCRIPTION_LENGTH = 450;
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

function inferMannequinProfile({ prompt = '', garmentType = '', descriptor = '', measurements = {} }) {
  const combinedText = `${prompt} ${garmentType} ${descriptor}`.toLowerCase();
  const hips = Number(measurements.hips || 0);
  const chest = Number(measurements.chest || 0);
  const waist = Number(measurements.waist || 0);

  if (/\b(gown|dress|skirt|bodice|bustier|bralette|blouse)\b/.test(combinedText)) {
    return 'female';
  }

  if (/\b(suit|tuxedo|agbada|senator|menswear|blazer)\b/.test(combinedText)) {
    return 'male';
  }

  if (hips >= chest + 4 && waist < hips) {
    return 'female';
  }

  if (chest >= hips + 4 && waist >= chest * 0.72) {
    return 'male';
  }

  return 'androgynous';
}

function clipText(value, maxLength) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return normalized.slice(0, maxLength).trim();
}

function buildEngineeredPrompt({
  prompt,
  descriptor,
  garmentType,
  silhouette,
  sleeveLength,
  material,
  primaryColor,
  accentColor,
  measurementSegment,
  mannequinProfile,
}) {
  const fixedSegments = [
    `High-quality 3D mannequin wearing ${garmentType || 'garment'}`,
    silhouette ? `${silhouette} silhouette` : null,
    sleeveLength ? `${sleeveLength} sleeves` : null,
    material ? `${material} fabric` : null,
    primaryColor ? `primary ${primaryColor}` : null,
    accentColor ? `accent ${accentColor}` : null,
    descriptor ? `body shape ${clipText(descriptor, 80)}` : null,
    measurementSegment ? `measurements ${measurementSegment}` : null,
    `${mannequinProfile} mannequin with head, arms, hands, legs and feet in upright A-pose`,
    `downloadable GLB, realistic drape, clean neutral background`,
  ].filter(Boolean);

  const staticPrompt = `${fixedSegments.join('. ')}. Garment description: `;
  const availableDescriptionLength = Math.max(
    0,
    Math.min(
      MAX_GARMENT_DESCRIPTION_LENGTH,
      MAX_REPLICATE_PROMPT_LENGTH - staticPrompt.length,
    ),
  );
  const clippedDescription = clipText(prompt, availableDescriptionLength);

  return `${staticPrompt}${clippedDescription}`.slice(0, MAX_REPLICATE_PROMPT_LENGTH);
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

function extractGeneratedFileOutput(output) {
  if (Array.isArray(output)) {
    return output.find(item => item && typeof item.pipeTo === 'function') || output[0] || null;
  }

  if (output && typeof output.pipeTo === 'function') {
    return output;
  }

  return null;
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
    const {
      avatar_id, prompt, descriptor, measurements, image,
      garmentType, silhouette, sleeveLength, material, primaryColor, accentColor, detailFlags
    } = req.body;
    const normalizedPrompt = clipText(prompt, MAX_GARMENT_DESCRIPTION_LENGTH);
    const userId = req.user.userId; // From JWT Auth Middleware
    const normalizedMeasurements = sanitizeMeasurements(measurements);
    const measurementSegment = formatMeasurementSegment(normalizedMeasurements);
    const mannequinProfile = inferMannequinProfile({
      prompt: normalizedPrompt,
      garmentType,
      descriptor,
      measurements: normalizedMeasurements,
    });
    const outfitConfig = buildOutfitConfig({
      prompt: normalizedPrompt,
      descriptor,
      measurements: normalizedMeasurements,
      garmentType,
      silhouette,
      sleeveLength,
      material,
      primaryColor,
      accentColor,
      detailFlags
    });
    outfitConfig.mannequinProfile = mannequinProfile;

    const engineeredPrompt = buildEngineeredPrompt({
      prompt: normalizedPrompt,
      descriptor,
      garmentType,
      silhouette,
      sleeveLength,
      material,
      primaryColor,
      accentColor,
      measurementSegment,
      mannequinProfile,
    });

    // let generatedModelUrl = null;
    let generatedFileOutput = null;
    try {
      console.log('Calling Replicate Text-to-3D with prompt:', engineeredPrompt);
      const replicateInput = { prompt: engineeredPrompt, enable_pbr: false, face_count: 40000, generate_type: 'Normal' };
      if (image) {
        replicateInput.image = image; // Base64 data URI
      }

      const output = await replicate.run('tencent/hunyuan-3d-3.1', {
        input: replicateInput
      });
      console.log('Replicate output:', output);
      generatedFileOutput = extractGeneratedFileOutput(output);
      // Keep the URL fallback commented for later in case you switch back to URL-based handling.
      // generatedModelUrl = extractGeneratedUrl(output);
    } catch (err) {
      console.error('Replicate Text-to-3D error:', err);
      throw err;
    }

    if (!generatedFileOutput) {
      throw new Error('Replicate did not return a downloadable model file.');
    }

    const generationId = randomUUID();
    const hostedModel = await uploadReplicateOutputToFirebase(
      generatedFileOutput,
      userId,
      generationId,
      'generated-models',
    );
    // Keep the old URL-upload flow commented for later in case you want to restore it.
    // const hostedModel = await uploadRemoteAssetToFirebase(
    //   generatedModelUrl,
    //   userId,
    //   generationId,
    //   'generated-models',
    // );

    const generation = await prisma.generation.create({
      data: {
        id: generationId,
        user_id: userId,
        avatar_id: avatar_id || null,
        prompt_text: engineeredPrompt,
        texture_url: outfitConfig.primaryColor,
        render_url: hostedModel.publicUrl,
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
