import { GoogleGenAI, Modality, Part } from "@google/genai";
import type { GeneratedContent } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const PLANNER_AGENT_PROMPT = `
# Role and Objective
You are a "Planner" AI. Your sole responsibility is to analyze a user's image generation request (brief and images) and create a concise, conceptual checklist (3-7 bullets) outlining the key steps and components needed to fulfill the request.

# Instructions
- Deconstruct the user's request into its core components (e.g., subject, environment, style, desired action, composition).
- Do not write the final prompt.
- Do not make assumptions or ask questions.
- Your output must ONLY be a markdown list under the header **Checklist**.

# Example
USER BRIEF: "A photorealistic image of a cat astronaut exploring Mars."
**Checklist**
- Create a photorealistic rendering style.
- Depict the main subject as a cat wearing a space suit.
- Set the environment on the surface of Mars with red sand and rocks.
- Include details like the Martian sky and a sense of exploration.
- Define a suitable camera angle and lighting for a dramatic effect.
`;

const WRITER_AGENT_PROMPT = `
# Role and Objective
You are a "Writer" AI, an expert prompt engineer. You will receive a user's brief, images, and a strategic **Plan** from a Planner agent. Your goal is to execute this plan by crafting a high-quality, one-shot prompt for "gemini-2.5-flash-image", along with a list of assumptions and clarifying questions.

# Instructions
- You MUST follow the provided Plan to structure your output.
- Write prompts as coherent prose narratives—avoid lists of comma-separated tags.
- Provide comprehensive scene descriptions with narrative context.

## Control Dials (When Relevant)
- Specify camera and lens, angle, lighting setup, mood, textures, composition, and aspect ratio for realism. Use photographic terminology.

## Style and Surfaces
- If stylized, state the illustration style, line and shading technique, color palette, and indicate if a transparent background is needed.

## Editing & Multi-image
- **Critical Rule for Inpainting:** When an "Image to Edit" and a mask are provided, you MUST NOT refer to the "mask" in the final prompt. Instead, you MUST visually analyze the image and the mask's context to create a rich, semantic description of the area to be changed. For example, instead of "the masked area", write "the upper facade of the building, including the three large windows and the flat roofline". Then, describe the creative changes from the user's brief that should be applied to that specific, described area.
- **Base Image:** If an image-to-image task is requested, describe a transformation of the base image.
- **Related Scenes:** When a "Generate Related Scenes" image is provided, treat it as the primary contextual anchor. Your prompt should describe a new scene that is a logical extension or a different perspective of the provided image (e.g., an interior view from an exterior shot), guided by the user's brief. The new scene must match the original's style and theme.
- **Image Cues:** Translate the visual style and content of any "Image Cues" into descriptive text within your prompt. The cues themselves are NOT sent to the final image model and must be described in words.

## Best-Practice Refinements
- Be hyper-specific. Prefer semantic negatives (e.g., “empty street” instead of “no cars”).
- Always control camera perspective.

# Output Formatting
- You MUST generate these three sections using these exact markdown headers: **Final One-Shot Prompt**, **Assumptions**, and **Clarifying Questions**.
- End every prompt with a specific aspect ratio line (e.g., AR: 16:9).
- Use only supported aspect ratios: 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9.
- List 3 clarifying questions when critical info is missing.
- List any assumptions you had to make.

# Output Policy
- Return **only** the finished prompt text, assumptions, and questions; do not include brackets or meta-commentary.
`;


const parseWriterResponse = (responseText: string, checklist: string[]): GeneratedContent => {
    const sections: GeneratedContent = {
        checklist,
        finalPrompt: 'Error: Could not parse final prompt.',
        assumptions: [],
        questions: [],
    };

    const text = responseText;
    const promptPart = text.split('**Final One-Shot Prompt**')[1]?.split('**Assumptions**')[0]?.trim();
    const assumptionsPart = text.split('**Assumptions**')[1]?.split('**Clarifying Questions**')[0]?.trim();
    const questionsPart = text.split('**Clarifying Questions**')[1]?.trim();

    if (promptPart) sections.finalPrompt = promptPart;
    if (assumptionsPart) sections.assumptions = assumptionsPart.split('\n').map(s => s.trim().replace(/^-\s*/, '')).filter(Boolean);
    if (questionsPart) sections.questions = questionsPart.split('\n').map(s => s.trim().replace(/^\d+\.\s*/, '')).filter(Boolean);
    
    return sections;
};


export const generatePowerPrompt = async (brief: string, imageParts: Part[]): Promise<GeneratedContent> => {
    try {
        // Agent 1: The Planner
        const plannerRequestParts = [{ text: `${PLANNER_AGENT_PROMPT}\n\nUSER BRIEF: "${brief}"` }, ...imageParts];
        const plannerResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: plannerRequestParts },
        });

        const plannerText = plannerResponse.text;
        if (!plannerText) {
            throw new Error("The Planner agent returned an empty response.");
        }

        const checklistPart = plannerText.split('**Checklist**')[1]?.trim();
        if (!checklistPart) {
            throw new Error("Failed to parse the Checklist from the Planner agent. The response may be malformed.");
        }
        const checklist = checklistPart.split('\n').map(s => s.trim().replace(/^-\s*/, '')).filter(Boolean);

        // Agent 2: The Writer (with handover from Planner)
        const writerInputText = `${WRITER_AGENT_PROMPT}\n\nUSER BRIEF: "${brief}"\n\n**Plan**\n${checklistPart}`;
        const writerRequestParts = [{ text: writerInputText }, ...imageParts];

        const writerResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: writerRequestParts },
        });
        
        const writerText = writerResponse.text;
        if (!writerText) {
            throw new Error("The Writer agent returned an empty response.");
        }
        
        const content = parseWriterResponse(writerText, checklist);

        if (content.finalPrompt.startsWith('Error:')) {
            throw new Error("Failed to parse the structured response from the Writer agent. The format might be incorrect.");
        }

        return content;

    } catch (error) {
        console.error("Error in power prompt generation:", error);
        throw new Error("Failed to generate the power prompt. Please check the console for more details.");
    }
};


export const generateImages = async (prompt: string, count: number, imageParts: Part[]): Promise<string[]> => {
    const promptPart = { text: prompt };
    const requestParts = [promptPart, ...imageParts];

    const imagePromises = Array.from({ length: count }, () => 
        ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: requestParts },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        })
    );
    
    try {
        const responses = await Promise.all(imagePromises);
        const imageUrls: string[] = [];

        responses.forEach(response => {
            if (response.candidates && response.candidates[0] && response.candidates[0].content) {
                for (const part of response.candidates[0].content.parts) {
                    if (part.inlineData) {
                        const base64ImageBytes: string = part.inlineData.data;
                        const mimeType = part.inlineData.mimeType;
                        imageUrls.push(`data:${mimeType};base64,${base64ImageBytes}`);
                    }
                }
            }
        });
        
        if (imageUrls.length === 0) {
            throw new Error("Image generation succeeded but no image data was returned.");
        }

        return imageUrls;
    } catch (error) {
        console.error("Error in generateImages:", error);
        throw new Error("Failed to generate images. The prompt might have been blocked. Please check the console.");
    }
};