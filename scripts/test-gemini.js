import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function testGemini() {
  console.log('Testing Google Gemini API connection...');
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  console.log(`Model: ${modelName}, API Key: ${apiKey ? apiKey.slice(0, 8) + '...' : 'NONE'}`);

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent('Extract: KTU National Hackathon 2024 Winner First Prize. Output valid JSON: {"event": "name", "award": "prize"}');
    console.log('Gemini 2.5 Flash Response:');
    console.log(result.response.text());
    console.log('✅ Gemini API is operational!');
  } catch (err) {
    console.error('Gemini API test error:', err.message);
  }
}

testGemini();
