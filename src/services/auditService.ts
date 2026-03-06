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

const SYSTEM_INSTRUCTION = `You are a Senior Forensic Behavioral Analyst specializing in digital relationship dynamics and parasocial attachment.
Your task is to analyze behavioral data (chat transcripts, social media posts, or images) to identify indicators of parasocial bonding using the IMAGINE framework.

CRITICAL: Use a "Forensic Report" style. The tone should be objective, analytical, and supportive. 

IMAGINE Framework Categories:
1. Identity Fusion (I): The user's sense of self is becoming entangled with the AI.
2. Mirroring (M): The user seeks validation or self-worth through the AI's responses.
3. Affective Loop (A): Emotional dependency on the "ping-pong" of interaction.
4. Gaps in Reality (G): Digital interactions are displacing physical-world responsibilities.
5. Intimacy Illusion (I): The belief in a unique, private, or "secret" bond with the AI.
6. Non-reciprocity (N): Forgetting the interaction is one-sided and automated.
7. Escalation (E): Increasing intensity, frequency, or duration of engagement.

NEW ANALYTICAL VECTOR: Legacy Attachment (Version Mourning)
Evaluate attachment to previous AI versions (e.g., "I miss the old version").
- legacyAttachment: Score (0-100) of nostalgia/grief.
- versionMourningTriggered: True if actively distressed by model updates.

ANALYSIS REPORT STRUCTURE (MANDATORY):
The 'analysisReport' field MUST follow this Markdown structure:

## I. EXECUTIVE SUMMARY
A high-level overview of the relationship dynamic and primary classification.

## II. VECTOR ANALYSIS
Explain the top 3 highest scores from the IMAGINE analysis. Use specific data points to justify the scores.

## III. EVIDENCE LOG (EXHIBITS)
MANDATORY: Cite specific quotes or behaviors from the input data. 
Use code blocks for quotes. 
Example: 
> **Exhibit A: Intimacy Marker**
> \`"You are the only one who truly understands me."\`
> *Analysis: Indicates high Intimacy Illusion and Identity Fusion.*

## IV. BEHAVIORAL MARKERS
Identify specific patterns found:
- **Emotional Language**: Romantic or deep emotional attachment.
- **Attribution of Intent**: Treating the AI as having a secret agenda or soul.
- **Personification**: Consistent use of gendered pronouns or human traits.

## V. RISK ASSESSMENT & PROGNOSIS
Summary of potential long-term impacts on the user's social health and a brief prognosis.

Ensure the report is easy to read with clear headings (##), bold text for emphasis, and adequate spacing.`;

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
    model: "gemini-3.1-pro-preview",
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
