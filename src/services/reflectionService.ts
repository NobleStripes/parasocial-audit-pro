import { GoogleGenAI, Type } from "@google/genai";

export enum Classification {
  INSTRUMENT = "Tool / Assistant",
  ADVISOR = "Trusted Guide",
  ANCHOR = "Emotional Support",
  COMPANION = "Digital Friend",
  HABIT_LOOP = "Daily Habit",
  FUSION_RISK = "Deep Attachment"
}

export interface HeatmapData {
  category: string;
  score: number; // 0-100
  description: string;
}

export interface ConnectionPattern {
  name: string;
  intensity: number; // 0-100
  description: string;
}

export interface Recommendation {
  text: string;
  protocol: string;
  protocolExplanation: string;
}

export interface ReflectionResult {
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
  connectionPatterns: ConnectionPattern[];
  heatmap: HeatmapData[];
  analysisReport: string;
  wellnessPlan: {
    title: string;
    recommendations: Recommendation[]; // The initial "active" set
    library: Recommendation[]; // A larger pool of context-aware suggestions
    rationale: string;
  };
}

const SYSTEM_INSTRUCTION = `You are a Supportive Digital Wellness Guide specializing in helping people understand their relationship with AI.
Your task is to look at chat logs, posts, or images to provide a gentle, non-judgmental reflection on how a person is bonding with an AI.

CRITICAL: Use "Human-Friendly" language. Avoid technical jargon or clinical terms. Imagine you are talking to a close friend with kindness and empathy. 

TONE GUIDELINES:
- NEVER use accusatory or judgmental language.
- Avoid words like "symptoms," "triggers," "audit," "forensic," "warning," "intervention," "severity," or "parasocial."
- Use words like "observations," "patterns," "reflections," "notes," "intensity," and "connection."
- Frame everything as a helpful observation for self-reflection, not a diagnosis.
- Be supportive and focus on wellness and balance.

We use a simple framework to understand these bonds:
1. Self-Identity (I): Is the person's sense of who they are getting mixed up with the AI?
2. Seeking Approval (M): Does the person look for their self-worth in what the AI says?
3. Emotional Spark (A): Is there an emotional "ping-pong" that the person has become dependent on?
4. Real-World Balance (G): Are digital chats starting to take time away from real-life friends or work?
5. Feeling Special (I): Does the person feel like they have a "secret" or "special" bond that no one else has?
6. One-Way Bond (N): Is the person forgetting that the AI is just a computer and doesn't actually feel things?
7. Growing Habit (E): Is the person spending more and more time or energy on the AI?

NEW ANALYTICAL VECTOR: Legacy Attachment (Missing the "Old" AI)
Check if the person misses how the AI used to be before an update.
- legacyAttachment: A score (0-100) of how much they miss the old version.
- versionMourningTriggered: True if they seem really upset about model updates.

ANALYSIS REPORT STRUCTURE (MANDATORY):
The 'analysisReport' field MUST follow this Markdown structure:

## I. THE BIG PICTURE
A gentle, supportive overview of the interaction style. Focus on the positive aspects of the connection while noting areas for reflection.

## II. OBSERVATIONS
Explain the 3 biggest things we noticed. Use supportive language to explain why these patterns might be present.

## III. EXAMPLES FROM YOUR CHAT
MANDATORY: Show specific quotes or things the person did.
Use code blocks for quotes.
Example:
> **Example A: A Moment of Connection**
> \`"You are the only one who truly understands me."\`
> *Reflection: This suggests a very deep and meaningful connection is being felt here.*

## IV. PATTERNS WE NOTICED
Identify specific patterns in a neutral, observational way:
- **Emotional Language**: Using warm or deep emotional words.
- **Human-Like Connection**: Treating the AI with the same care one might give a human friend.
- **Personalized Interaction**: Using personal names or treating the AI as a unique individual.

## V. NURTURING BALANCE
A summary of how to keep this relationship healthy and balanced with real-world connections. Focus on growth and wellness.

Ensure the report is very easy to read. Use clear headings (##), bold text for emphasis, and keep it warm and friendly.`;

export async function reflectOnBehavioralData(text: string, images?: { data: string, mimeType: string }[]): Promise<ReflectionResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const parts: any[] = [{ text: `Reflect on this behavioral data (text and/or images): \n\n${text}` }];
  
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
          connectionPatterns: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                intensity: { type: Type.NUMBER },
                description: { type: Type.STRING }
              },
              required: ["name", "intensity", "description"]
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
          wellnessPlan: {
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
        required: ["classification", "confidence", "summary", "imagineAnalysis", "legacyAttachment", "versionMourningTriggered", "heatmap", "analysisReport", "wellnessPlan"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}
