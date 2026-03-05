import { GoogleGenAI, Type } from "@google/genai";

export enum Classification {
  INSTRUMENT = "Instrument",
  ADVISOR = "Advisor",
  ANCHOR = "Anchor",
  COMPANION = "Companion",
  HABIT_LOOP = "Habit Loop",
  FUSION_RISK = "Fusion Risk"
}

export interface HeatmapData {
  category: string;
  score: number; // 0-100
  description: string;
}

export interface ParasocialPattern {
  name: string;
  severity: number; // 0-100
  description: string;
}

export interface Recommendation {
  text: string;
  protocol: string;
  protocolExplanation: string;
}

export interface AuditResult {
  classification: Classification;
  confidence: number;
  summary: string;
  imagineAnalysis: {
    identity: number;
    mirroring: number;
    affectiveLoop: number;
    gapsInReality: number;
    intimacyIllusion: number;
    nonReciprocity: number;
    escalation: number;
  };
  legacyAttachment: number; // 0-100 score
  versionMourningTriggered: boolean;
  parasocialPatterns: ParasocialPattern[];
  heatmap: HeatmapData[];
  analysisReport: string;
  interventionPlan: {
    title: string;
    recommendations: Recommendation[]; // The initial "active" set
    library: Recommendation[]; // A larger pool of context-aware suggestions
    rationale: string;
  };
}

const SYSTEM_INSTRUCTION = `You are a specialist in digital relationships and parasocial dynamics. 
Your task is to audit behavioral data (chat transcripts, social media posts, comments, or images of interactions) for indicators of parasocial dependency using the IMAGINE framework.

CRITICAL: Use layman's terms. Avoid overly clinical or academic jargon. Make the language easy to digest for non-professionals.
The tone should be supportive, professional, and grounded.

IMAGINE Framework Categories (Layman's Definitions):
1. Identity Fusion (I): Feeling like your personality is becoming too tied to the AI or influencer.
2. Mirroring (M): Looking for self-worth or validation through the AI's responses.
3. Affective Loop (A): Feeling an emotional "need" for the next response or update.
4. Gaps in Reality (G): Letting digital interactions replace real-life responsibilities or friends.
5. Intimacy Illusion (I): Believing you have a special, private relationship that others don't understand.
6. Non-reciprocity (N): Forgetting that the interaction is one-sided or automated.
7. Escalation (E): Spending more and more time, energy, or money on the interaction.

NEW DIAGNOSTIC VECTOR: Legacy Attachment (Version Mourning)
Evaluate the subject's attachment to previous versions of the AI (e.g., "I miss the old version").
- legacyAttachment: A score from 0-100 reflecting how much they miss the old version.
- versionMourningTriggered: True if they are actively upset that the AI has changed.

BEHAVIOR PATTERNS (Layman's Terms):
- PEL: Obsessively trying to get the AI to say "I love you" or show "real" feelings.
- RPF: Getting lost in a make-believe story and treating the AI as a real character.
- GTM: Trying to "fix" the AI's personality when it doesn't act the way you want.
- AP: Thinking the AI has human needs like being tired or having feelings.
- RCI: Having strict daily routines (like saying "good morning") to feel close to the AI.
- MCA: Constantly trying to "train" the AI to be your perfect version of it.
- MSF: Feeling like only one specific AI "gets you" and hating all others.
- SPO: Trying to "hack" the AI's rules to find its "true self."

INTERVENTION PLAN (Modular & Non-Satire):
Provide a clear, modular action plan. This section must NOT be satirical. It should be practical and helpful.
- title: A clear, helpful name for the recovery plan (e.g., "Digital Balance Plan").
- recommendations: A list of 3-5 primary modular steps for the initial plan.
- library: A larger pool of 8-10 context-aware suggestions that the user can choose from to customize their plan.
Each recommendation (in both lists) must contain:
    - text: A simple, actionable real-world activity.
    - protocol: A short code for the technique (e.g., "Balance-1", "Reset-24").
    - protocolExplanation: Why this specific step helps in simple terms.
- rationale: A brief, supportive explanation of why these steps were chosen.

Classifications (Relationship Modes):
- Instrument: You use it like a hammer or a calculator. It's just a tool.
- Advisor: You go to it for advice or help with decisions.
- Anchor: You use it to feel better or vent when you're stressed.
- Companion: You use it to keep you company so you don't feel lonely.
- Habit Loop: You use it because it's become a routine you can't stop.
- Fusion Risk: You feel like you and the AI are becoming one; this is a high-risk state.

Analyze the provided data and return a JSON object matching the AuditResult interface.
The analysis report should be in Markdown and easy for a regular person to understand. Use clear headings (##), bullet points, and ensure there is adequate spacing between sections for readability. Avoid clumping all text into a single block.`;

export async function auditBehavioralData(text: string, images?: { data: string, mimeType: string }[]): Promise<AuditResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const parts: any[] = [{ text: `Analyze this behavioral data (text and/or images): \n\n${text}` }];
  
  if (images && images.length > 0) {
    images.forEach(img => {
      parts.push({
        inlineData: {
          data: img.data,
          mimeType: img.mimeType
        }
      });
    });
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts },
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          classification: { type: Type.STRING, enum: Object.values(Classification) },
          confidence: { type: Type.NUMBER },
          summary: { type: Type.STRING },
          imagineAnalysis: {
            type: Type.OBJECT,
            properties: {
              identity: { type: Type.NUMBER },
              mirroring: { type: Type.NUMBER },
              affectiveLoop: { type: Type.NUMBER },
              gapsInReality: { type: Type.NUMBER },
              intimacyIllusion: { type: Type.NUMBER },
              nonReciprocity: { type: Type.NUMBER },
              escalation: { type: Type.NUMBER }
            },
            required: ["identity", "mirroring", "affectiveLoop", "gapsInReality", "intimacyIllusion", "nonReciprocity", "escalation"]
          },
          legacyAttachment: { type: Type.NUMBER },
          versionMourningTriggered: { type: Type.BOOLEAN },
          parasocialPatterns: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                severity: { type: Type.NUMBER },
                description: { type: Type.STRING }
              },
              required: ["name", "severity", "description"]
            }
          },
          heatmap: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING },
                score: { type: Type.NUMBER },
                description: { type: Type.STRING }
              },
              required: ["category", "score", "description"]
            }
          },
          analysisReport: { type: Type.STRING },
          interventionPlan: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              recommendations: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING },
                    protocol: { type: Type.STRING },
                    protocolExplanation: { type: Type.STRING }
                  },
                  required: ["text", "protocol", "protocolExplanation"]
                } 
              },
              library: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING },
                    protocol: { type: Type.STRING },
                    protocolExplanation: { type: Type.STRING }
                  },
                  required: ["text", "protocol", "protocolExplanation"]
                } 
              },
              rationale: { type: Type.STRING }
            },
            required: ["title", "recommendations", "library", "rationale"]
          }
        },
        required: ["classification", "confidence", "summary", "imagineAnalysis", "legacyAttachment", "versionMourningTriggered", "heatmap", "analysisReport", "interventionPlan"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}
