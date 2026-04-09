
const axios = require('axios');
const pdfParseModule = require('pdf-parse');

const DEFAULT_ATS_MODELS = [
  'openai/gpt-oss-20b:free',
  'openai/gpt-oss-120b:free',
  'google/gemma-4-26b-a4b-it:free'
];

function clampScore(score) {
  const parsed = Number(score);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function extractScoreFromModelOutput(content) {
  if (!content || typeof content !== 'string') return null;

  // Prefer JSON response if model follows instruction.
  try {
    const parsed = JSON.parse(content);
    if (typeof parsed === 'object' && parsed !== null && 'score' in parsed) {
      return clampScore(parsed.score);
    }
  } catch (_) {
    // Ignore JSON parse errors and continue with regex extraction.
  }

  const match = content.match(/(?:score|ats)[^\d]{0,20}(\d{1,3})/i) || content.match(/\b(\d{1,3})\b/);
  if (!match) return null;
  return clampScore(match[1]);
}

function normalizeTokens(text) {
  if (!text || typeof text !== 'string') return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function keywordOverlapScore(resumeText, jobDescription) {
  const resumeTokens = normalizeTokens(resumeText);
  const jobTokens = normalizeTokens(jobDescription);

  if (!resumeTokens.length || !jobTokens.length) return 0;

  const resumeSet = new Set(resumeTokens);
  const jobSet = new Set(jobTokens);
  const overlap = [...jobSet].filter((token) => resumeSet.has(token)).length;
  const overlapRatio = overlap / jobSet.size;

  // Weighted by resume length confidence to avoid inflated scores for tiny resumes.
  const lengthConfidence = Math.min(1, resumeTokens.length / 250);
  const raw = overlapRatio * 100 * (0.7 + 0.3 * lengthConfidence);
  return clampScore(raw);
}

async function extractPdfTextFromBuffer(buffer) {
  // Support both old pdf-parse API (function export) and v2 API (PDFParse class).
  if (typeof pdfParseModule === 'function') {
    const data = await pdfParseModule(buffer);
    return data?.text || '';
  }

  if (pdfParseModule && typeof pdfParseModule.PDFParse === 'function') {
    const parser = new pdfParseModule.PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result?.text || '';
    } finally {
      await parser.destroy();
    }
  }

  throw new Error('Unsupported pdf-parse module export format');
}

async function evaluateResumeATS(resumeUrl, jobDescription) {
  try {
    // 1. Fetch PDF from Cloudinary URL
    const response = await axios.get(resumeUrl, { responseType: 'arraybuffer' });
    
    // 2. Extract text from PDF buffer
    let resumeText = '';
    try {
      resumeText = await extractPdfTextFromBuffer(response.data);
    } catch (parseError) {
      console.error('Error parsing PDF:', parseError.message);
      return 0;
    }

    if (!resumeText || resumeText.trim().length === 0) {
      return 0;
    }

    // 3. Make request to OpenRouter API
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterKey) {
      console.warn("OPENROUTER_API_KEY is not set. Skipping real ATS evaluation.");
      return keywordOverlapScore(resumeText, jobDescription);
    }

    const requestedModel = process.env.OPENROUTER_ATS_MODEL;
    const envFallbackModel = process.env.OPENROUTER_ATS_FALLBACK_MODEL;
    const modelsToTry = [
      ...(requestedModel ? [requestedModel] : []),
      ...(envFallbackModel ? [envFallbackModel] : []),
      ...DEFAULT_ATS_MODELS
    ].filter((model, index, arr) => model && arr.indexOf(model) === index);

    for (const modelName of modelsToTry) {
      try {
        const payload = {
          model: modelName,
          temperature: 0,
          max_tokens: 40,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: "system",
              content: "You are an ATS evaluator. Return strict JSON only in this format: {\"score\": <integer 0-100>}. Do not include any extra text."
            },
            {
              role: "user",
              content: `Evaluate resume-to-job match quality.\n\nJob Description:\n${jobDescription}\n\nResume:\n${resumeText}`
            }
          ]
        };

        const aiResponse = await axios.post('https://openrouter.ai/api/v1/chat/completions', payload, {
          headers: {
            'Authorization': `Bearer ${openRouterKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 20000
        });

        const content = aiResponse?.data?.choices?.[0]?.message?.content?.trim() || '';
        const extractedScore = extractScoreFromModelOutput(content);
        if (extractedScore !== null) {
          return extractedScore;
        }
      } catch (modelError) {
        console.error(`ATS model failed (${modelName}):`, modelError.message);
      }
    }

    console.warn('Unable to parse ATS model response, using keyword-overlap fallback.');
    return keywordOverlapScore(resumeText, jobDescription);
  } catch (err) {
    console.error('ATS Evaluation Error:', err.message);
    if (err.response?.data) {
      console.error('ATS Evaluation Error (response):', JSON.stringify(err.response.data));
    }
    return 0;
  }
}

module.exports = { evaluateResumeATS };
