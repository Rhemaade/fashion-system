const { PrismaClient } = require('@prisma/client');
const Replicate = require('replicate');
const prisma = new PrismaClient({

});

// Initialize replicate. Note: REPLICATE_API_TOKEN must be set in .env
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

exports.generateDesign = async (req, res) => {
  try {
    const { avatar_id, prompt, descriptor, color } = req.body;
    const userId = req.user.userId; // From JWT Auth Middleware

    // Prompt Formatting Logic
    const engineeredPrompt = `A photorealistic full-body fashion photography of a ${descriptor} body shape wearing a ${color ? color + ' ' : ''}${prompt}. High fashion, runway lighting, 8k resolution, highly detailed fabric textures.`;

    console.log("Sending prompt to AI:", engineeredPrompt);

    // Mock API call if token is missing
    if (!process.env.REPLICATE_API_TOKEN) {
      console.warn("REPLICATE_API_TOKEN is missing. Returning mocked AI response.");
      const mockGeneration = await prisma.generation.create({
        data: {
          user_id: userId,
          avatar_id: avatar_id || null,
          prompt_text: engineeredPrompt,
          texture_url: 'https://i.pinimg.com/236x/91/ef/b8/91efb88d5d91fa64d404a74aeafd1e0f.jpg',
        }
      });
      return res.status(202).json({ message: 'Generation started (MOCK)', data: mockGeneration });
    }

    // Call Replicate Stable Diffusion
    // Using a typical stable diffusion model identifier for Replicate
    const output = await replicate.run(
      "stability-ai/stable-diffusion:27b93a2413e7f36cd83da926f3656280b2931564ff050bf9575f1fdf9bcd7478",
      {
        input: {
          prompt: engineeredPrompt,
          negative_prompt: "ugly, blurry, deformed, low quality, bad anatomy",
          width: 512,
          height: 768,
        }
      }
    );

    // output is an array of image URLs
    const generatedUrl = output[0];

    // Save to Database
    const generation = await prisma.generation.create({
      data: {
        user_id: userId,
        avatar_id: avatar_id || null,
        prompt_text: engineeredPrompt,
        texture_url: generatedUrl,
      }
    });

    res.status(200).json({ message: 'Design generation complete', data: generation });

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
    res.status(200).json({ data: designs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch designs' });
  }
};
