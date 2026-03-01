import Anthropic from '@anthropic-ai/sdk';
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
  if (!process.env.ANTHROPIC_API_KEY) {
    return { findings: [], tokensUsed: 0 };
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const userMessage = JSON.stringify({
    model: modelSummary,
    deterministicFindings,
    simulationSummary: simSummary ?? null,
  });

  const response = await client.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 1024,
    system:
      'You are a spacecraft thermal engineer with 20 years of experience. Analyze this thermal model and provide concise, actionable engineering recommendations.',
    messages: [
      {
        role: 'user',
        content: `Analyze this thermal model data and provide additional findings beyond the automated checks.\n\n${userMessage}\n\nReturn ONLY valid JSON matching: {"findings": [{"category": "model_quality" | "results" | "materials" | "energy_balance", "severity": "info" | "warning" | "critical", "title": "...", "description": "...", "affectedEntities": [], "recommendation": "..."}]}\n\nProvide up to 5 findings. Focus on insights the deterministic checks might miss.`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    return { findings: [], tokensUsed: response.usage.output_tokens + response.usage.input_tokens };
  }

  try {
    const parsed = JSON.parse(textBlock.text) as { findings: AdvisorFinding[] };
    return {
      findings: (parsed.findings ?? []).slice(0, 5),
      tokensUsed: response.usage.output_tokens + response.usage.input_tokens,
    };
  } catch {
    return {
      findings: [],
      tokensUsed: response.usage.output_tokens + response.usage.input_tokens,
    };
  }
}
