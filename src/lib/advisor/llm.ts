import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AdvisorFinding } from './rules';

export async function runLLMAdvisor(
  modelSummary: {
    name: string;
    nodeCount: number;
    conductorCount: number;
    heatLoadCount: number;
  },
  deterministicFindings: AdvisorFinding[],
  simSummary?: { minTemp: number; maxTemp: number; runId: string },
): Promise<{ findings: AdvisorFinding[]; tokensUsed: number }> {
  if (!process.env.GEMINI_API_KEY) {
    return { findings: [], tokensUsed: 0 };
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.2,
    },
    systemInstruction:
      'You are a spacecraft thermal engineer with 20 years of experience. Analyze this thermal model and provide concise, actionable engineering recommendations.',
  });

  const userMessage = JSON.stringify({
    model: modelSummary,
    deterministicFindings,
    simulationSummary: simSummary ?? null,
  });

  const prompt = `Analyze this thermal model data and provide additional findings beyond the automated checks.\n\n${userMessage}\n\nReturn ONLY valid JSON matching: {"findings": [{"category": "model_quality" | "results" | "materials" | "energy_balance", "severity": "info" | "warning" | "critical", "title": "...", "description": "...", "affectedEntities": [], "recommendation": "..."}]}\n\nProvide up to 5 findings. Focus on insights the deterministic checks might miss.`;

  const result = await model.generateContent(prompt);
  const totalTokens = result.response.usageMetadata?.totalTokenCount ?? 0;

  try {
    const text = result.response.text();
    const parsed = JSON.parse(text) as { findings: AdvisorFinding[] };
    return {
      findings: (parsed.findings ?? []).slice(0, 5),
      tokensUsed: totalTokens,
    };
  } catch {
    return {
      findings: [],
      tokensUsed: totalTokens,
    };
  }
}
