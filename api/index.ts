import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import Replicate from 'replicate';
import { HfInference } from '@huggingface/inference';

export const app = express();

app.use(express.json({ limit: '100mb' }));

// Need to handle large files.
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB limit
  }
});

let replicateClient: Replicate | null = null;
let hfClient: HfInference | null = null;

const initAI = () => {
    if (process.env.REPLICATE_API_TOKEN) {
        replicateClient = new Replicate({
            auth: process.env.REPLICATE_API_TOKEN,
        });
    }
    if (process.env.HUGGINGFACE_API_KEY) {
        hfClient = new HfInference(process.env.HUGGINGFACE_API_KEY);
    }
};

initAI();

const checkKeys = () => {
  const missingKeys = [];
  if (!process.env.REPLICATE_API_TOKEN) missingKeys.push('REPLICATE_API_TOKEN');
  if (!process.env.HUGGINGFACE_API_KEY) missingKeys.push('HUGGINGFACE_API_KEY');
  return missingKeys;
};

// Check keys on startup
const missing = checkKeys();
if (missing.length > 0) {
    console.error('⚠️ WARNING: The following API keys are missing from environment variables:');
    missing.forEach(key => console.error(` - ${key}`));
    console.error('AI features will not work until these keys are provided.');
} else {
    console.log('✅ All AI API keys are present. AI services activated.');
}

const MODELS = {
  'real-esrgan': 'nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b',
  'gfpgan': 'tencentarc/gfpgan:9283608cc6b7be6b65a8e44983db012355fde4132009bf99d976b2f0896856a3',
  'video-upscale': 'cjwbw/video-restoration:9244ebfb22934b12aa11e868a27dcb3ea3e433db9b892dddc182fb8e578f16b2',
  'rife': 'lucataco/rife:a416dfb0fcdcb83aa2c3fdbb624f1e00ec6a4ec8eb4f9ce2576b509ed91795c4',
  'colorize': 'piddnad/ddcolor:ca494ba129e44e45f661d6ece83c4c98a9a7c774309beca01429b58fce8aa695'
};

app.get('/api/status', (req, res) => {
    const missingKeys = checkKeys();
    res.json({
        replicate: !!process.env.REPLICATE_API_TOKEN,
        huggingface: !!process.env.HUGGINGFACE_API_KEY,
        missingKeys,
        status: missingKeys.length === 0 ? 'ok' : 'missing_keys'
    });
});

app.post('/api/enhance', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded.' });
      return;
    }

    const missingKeys = checkKeys();
    if (missingKeys.length > 0) {
      res.status(500).json({ error: `Missing API Keys: ${missingKeys.join(', ')}` });
      return;
    }

    if (!replicateClient) {
        initAI();
    }

    if (!replicateClient) {
        res.status(500).json({ error: 'Replicate client failed to initialize.' });
        return;
    }

    const { type } = req.body;
    let modelId = MODELS['real-esrgan'];
    let inputObj: any = {};

    const b64 = req.file.buffer.toString('base64');
    const dataUri = `data:${req.file.mimetype};base64,${b64}`;

    if (type === 'image-upscale') {
      modelId = MODELS['real-esrgan'];
      inputObj = { image: dataUri, scale: 4, face_enhance: true };
    } else if (type === 'face-restore') {
      modelId = MODELS['gfpgan'];
      inputObj = { img: dataUri, scale: 2, version: "v1.4" };
    } else if (type === 'video-upscale') {
      modelId = MODELS['video-upscale'];
      inputObj = { video: dataUri, task: "Video Super-Resolution" };
    } else if (type === 'rife') {
      modelId = MODELS['rife'];
      inputObj = { video: dataUri };
    } else if (type === 'colorize') {
      modelId = MODELS['colorize'];
      inputObj = { image: dataUri };
    } else {
      res.status(400).json({ error: 'Invalid enhancement type.' });
      return;
    }

    const prediction = await replicateClient.predictions.create({
      version: modelId.split(':')[1],
      input: inputObj,
    });

    res.json({ predictionId: prediction.id, status: prediction.status });
  } catch (error: any) {
    console.error('Enhance API error:', error);
    res.status(500).json({ error: error.message || 'Error creating prediction' });
  }
});

app.get('/api/prediction/:id', async (req, res) => {
  try {
    if (!replicateClient) initAI();
    
    if (!replicateClient) {
        res.status(500).json({ error: 'Replicate client failed to initialize.' });
        return;
    }
    const { id } = req.params;
    const prediction = await replicateClient.predictions.get(id);
    res.json(prediction);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error fetching prediction' });
  }
});

export default app;
