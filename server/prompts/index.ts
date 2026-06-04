import { LEGAL_GEORGIA_PROMPT }       from './legal-georgia.js';
import { BUSINESS_ASSISTANT_PROMPT }  from './business-assistant.js';
import { FINANCE_PROMPT }             from './finance.js';
import { MARKETING_PROMPT }           from './marketing.js';
import { RESEARCHER_PROMPT }          from './researcher.js';
import { SALES_PROMPT }               from './sales.js';
import { REALESTATE_PROMPT }          from './realestate.js';
import { PERSONAL_ASSISTANT_PROMPT }  from './personal-assistant.js';
import { HR_PROMPT }                  from './hr.js';
import { IT_MANAGER_PROMPT }          from './it-manager.js';
import { COPYWRITER_PROMPT }          from './copywriter.js';
import { PR_MANAGER_PROMPT }          from './pr-manager.js';
import { ACCOUNTANT_PROMPT }          from './accountant.js';
import { COACH_PROMPT }               from './coach.js';
import { DEVELOPER_PROMPT }           from './developer.js';
import { OPERATIONS_PROMPT }          from './operations.js';

// ─────────────────────────────────────────────────────────────────────────────
// Prompt registry — maps agentId → system prompt.
//
// All agents listed here are accepted by /api/chat.
// In mock mode (no ANTHROPIC_API_KEY), the server streams a demo response
// instead of calling Anthropic — prompts are still registered so the
// architecture is identical whether real AI or mock is used.
// ─────────────────────────────────────────────────────────────────────────────

const PROMPTS: Record<string, string> = {
  'lawyer-georgia':      LEGAL_GEORGIA_PROMPT,
  'business-assistant':  BUSINESS_ASSISTANT_PROMPT,
  'finance':             FINANCE_PROMPT,
  'marketing':           MARKETING_PROMPT,
  'researcher':          RESEARCHER_PROMPT,
  'sales':               SALES_PROMPT,
  'realestate':          REALESTATE_PROMPT,
  'personal-assistant':  PERSONAL_ASSISTANT_PROMPT,
  'hr':                  HR_PROMPT,
  'it-manager':          IT_MANAGER_PROMPT,
  'copywriter':          COPYWRITER_PROMPT,
  'pr-manager':          PR_MANAGER_PROMPT,
  'accountant':          ACCOUNTANT_PROMPT,
  'coach':               COACH_PROMPT,
  'developer':           DEVELOPER_PROMPT,
  'operations':          OPERATIONS_PROMPT,
};

export function getSystemPrompt(agentId: string): string | null {
  return PROMPTS[agentId] ?? null;
}

export const ALLOWED_AGENT_IDS = Object.keys(PROMPTS);
