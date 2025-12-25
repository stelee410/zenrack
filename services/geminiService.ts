
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateHealingChords(mood: string): Promise<string[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `You are a world-class ambient composer and sound therapist specializing in psychoacoustic healing.
      Generate a deeply resonant, sophisticated chord progression for a "${mood}" session.
      
      GUIDELINES FOR HARMONIC DEPTH:
      1. SOPHISTICATION: Strictly AVOID simple triads (e.g., C, Am). Use extended harmonies (maj9, m11, 13, 6/9) and suspensions (sus2, 13sus4) to create ambiguity and space.
      2. VOICE LEADING: Ensure smooth transitions between chords to maintain a meditative flow.
      3. MOOD MATCHING:
         - For "Sleep": Use darker, warmer chords (m9, maj7, mb6).
         - For "Focus": Use stable but interesting chords (6/9, maj9, add9).
         - For "Anxiety": Use unresolved suspensions and gentle resolutions (sus4 -> maj7).
         - For "Manifest": Use bright, open chords (Lydian vibes, maj7#11).
      4. LENGTH: Provide exactly 8 chords.
      
      Valid Extended Types: maj7, maj9, maj7#11, m7, m9, m11, 7, 9, 11, 13, sus2, sus4, 7sus4, 13sus4, 6/9, add9.
      Example Output: ["Cmaj9", "Am11", "Fmaj7#11", "G13sus4", "Ebmaj7", "Dm9", "Bbmaj9", "G7sus4"]`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            chords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "A list of 8 sophisticated, color-rich chords.",
              minItems: 8,
              maxItems: 8
            }
          },
          required: ["chords"]
        }
      }
    });

    const text = response.text;
    if (!text) return ["Cmaj9", "Am11", "F6/9", "G13sus4", "Cadd9", "Em7", "Dm9", "G7"];
    
    const data = JSON.parse(text);
    return data.chords || ["Cmaj9", "Am11", "F6/9", "G13sus4"];
  } catch (error) {
    console.error("AI Chord Error:", error);
    return ["Cmaj9", "Am11", "F6/9", "G13sus4", "Cadd9", "Em7", "Dm9", "G7"];
  }
}

export async function generateSynthConfig(prompt: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `You are an expert in meditative sound synthesis and music theory. Design a full ZenRack patch for: "${prompt}".
      
      Requirements:
      1. BPM: 40-75 (Healing/Slow breathing tempo).
      2. Chords: Exactly 8 rich, complex ambient chords. STRICTLY AVOID basic triads (C, F, G, Am). PREFER extended chords: maj9, m9, m11, 13, 6/9, maj7#11, 13sus4. The progression should feel floating, "infinite", and evolving.
      3. Drum: An ethereal 808 sequence (minimalist, heartbeat-like or sparse textures).
      4. Generators: Configure 3 oscillators to create a cinematic soundscape.
         - Gen 1: Sub-bass or grounding drone (Sine/Triangle, low freq).
         - Gen 2: Texture or Binaural Beat carrier.
         - Gen 3: Ethereal high plucks or shimmer (Triangle/Sine).
      
      The overall feeling should be professional and "Evolving".`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bpm: { type: Type.NUMBER },
            chords: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              minItems: 8,
              maxItems: 8
            },
            drumSeq: {
              type: Type.ARRAY,
              items: {
                type: Type.ARRAY,
                items: { type: Type.BOOLEAN },
                minItems: 16,
                maxItems: 16
              },
              minItems: 4,
              maxItems: 4
            },
            generators: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  active: { type: Type.BOOLEAN },
                  frequency: { type: Type.NUMBER },
                  binauralBeat: { type: Type.NUMBER },
                  waveform: { type: Type.STRING, enum: ["sine", "square", "sawtooth", "triangle"] }
                },
                required: ["active", "frequency", "binauralBeat", "waveform"]
              },
              minItems: 3,
              maxItems: 3
            }
          },
          required: ["bpm", "chords", "drumSeq", "generators"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("AI Global Config Error:", error);
    return null;
  }
}

export async function generateStrudelCode(currentCode: string, prompt: string): Promise<string | null> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are an expert in Strudel live coding language. Given the current Strudel code and a user's request, generate improved or modified Strudel code.

Current code:
\`\`\`
${currentCode || '// Empty code'}
\`\`\`

User request: "${prompt}"

Requirements:
1. Return ONLY the complete Strudel code, without any explanation or markdown formatting
2. If the current code has setcps(), preserve it or update it appropriately
3. Maintain the overall structure and style of the code when possible
4. Generate valid Strudel code that follows best practices
5. Make sure the code is complete and runnable

Generate the new Strudel code:`,
    });

    const text = response.text;
    if (!text) return null;
    
    // 清理可能的 markdown 代码块标记
    let cleanedCode = text.trim();
    if (cleanedCode.startsWith('```')) {
      // 移除开头的 ``` 和可能的语言标记
      cleanedCode = cleanedCode.replace(/^```[\w]*\n?/, '');
    }
    if (cleanedCode.endsWith('```')) {
      // 移除结尾的 ```
      cleanedCode = cleanedCode.replace(/\n?```$/, '');
    }
    
    return cleanedCode.trim();
  } catch (error) {
    console.error("AI Strudel Code Generation Error:", error);
    return null;
  }
}
