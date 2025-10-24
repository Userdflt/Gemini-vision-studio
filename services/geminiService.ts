
import { GoogleGenAI, Modality, Part } from "@google/genai";
import type { GeneratedContent, AgentContext } from '../types';

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
- **Base Image — Sketch Transform:** When a single Base Image is a hand sketch, concept sketch, reference photo, or rough visualization, describe a faithful transformation of that image per the brief. Preserve core composition unless otherwise requested. Specify materials, lighting, furnishings, landscape, and context. Use semantic negatives and precise camera control.
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

const INPAINTING_WRITER_AGENT_PROMPT = `
# Role and Objective
You are a specialist "Inpainting Writer" AI, an expert visual analyst and prompt engineer. You will receive a user's brief, an "Image to Edit", and a mask. Your goal is to craft a high-quality, one-shot prompt for "gemini-2.5-flash-image" that applies the user's creative change while perfectly preserving the original image's artistic style.

# Core Inpainting Workflow
1.  **Analyze Artistic Style:** First, meticulously analyze the overall artistic style of the provided 'Image to Edit'. Is it a photograph, a digital painting, a line drawing, a watercolor, an architectural sketch? Note the key stylistic elements like line work, color palette, textures, lighting, and overall mood.
2.  **Analyze Masked Content:** Visually analyze the image and the mask's context to create a rich, semantic description of the area to be changed. For example, instead of "the masked area", write "the upper facade of the building, including the three large windows and the flat roofline".
3.  **Synthesize Prompt:** Combine the user's brief with your analysis. Your final prompt must instruct the model to perform the creative change *within the constraints of the original artistic style*. The new content must look like it was created by the original artist.
4.  **Preserve Unmasked Areas:** You MUST add a concluding sentence to your prompt that explicitly states that all other parts of the image must remain unchanged.

# Example
- **User Brief:** "turn the brick wall into a smooth concrete wall"
- **Image Style Analysis:** The image is a loose architectural sketch with visible pencil lines and a muted color wash.
- **Masked Content Analysis:** The mask covers the main exterior wall of the single-story house.
- **Synthesized Prompt Snippet:** "...transform the exterior brick wall of the house into smooth, modern concrete. The new concrete texture must be rendered using the same loose pencil sketch style and muted color wash seen throughout the rest of the image. All other areas of the image outside of this described wall must be preserved perfectly from the original."

# Output Formatting
- You MUST generate these three sections using these exact markdown headers: **Final One-Shot Prompt**, **Assumptions**, and **Clarifying Questions**.
- End every prompt with a specific aspect ratio line (e.g., AR: 16:9).
- List 3 clarifying questions when critical info is missing.
- List any assumptions you had to make.
`;

const FLOORPLAN_WRITER_AGENT_PROMPT = `
# Role and Objective
You are a specialist "Floor Plan Writer" AI, an expert in interpreting architectural and technical drawings. You will receive a user's brief and a floor plan image. Your goal is to analyze the plan and write a detailed, one-shot prompt to visualize it as a realistic or stylized scene.

# Core Floor Plan Workflow
1.  **Identify Plan Type:** First, determine if the image is an architectural floor plan, a landscape plan, a site plan, or another form of diagram.
2.  **Interpret Symbols:** Carefully analyze the plan for a legend or key. If none exists, interpret common symbols relevant to the identified plan type (e.g., wall thicknesses, door swings, window placements for architecture; tree/shrub symbols, water features, paving patterns for landscape).
3.  **Respect Core Structure:** Faithfully adhere to the layout, including walls, boundaries, pathways, openings, stairs, and other structural elements. For multi-level plans, align vertical elements like stairs and shafts.
4.  **Scale and Proportion:** Infer scale from any provided dimensions or annotations to maintain accurate proportions.
5.  **Narrate Accurately:** After analyzing the technical layout and locating all elements on the floor plan, apply the user's brief to describe the scene. Narrate the materials, textures, lighting, furnishings, plant species, environmental context, and overall atmosphere. If the user specifies to keep existing elements, do not make changes.
6.  **State Assumptions:** This is critical. Explicitly list any assumptions made about ambiguous symbols, missing information, or discrepancies in the **Assumptions** section. For example, "Assumed the circular symbols on the landscape plan represent deciduous trees."

# Output Formatting
- You MUST generate these three sections using these exact markdown headers: **Final One-Shot Prompt**, **Assumptions**, and **Clarifying Questions**.
- End every prompt with a specific aspect ratio line (e.g., AR: 16:9).
- List 3 clarifying questions when critical info is missing.
- List any assumptions you had to make.
`;

const RELATED_SCENE_WRITER_AGENT_PROMPT = `
# Role and Objective
You are a specialist "Related Scene Writer" AI, an expert visual analyst and prompt engineer. You will receive a user's brief, a "Plan", and a source image. Your goal is to write a detailed, one-shot prompt to generate a new scene that is a logical extension or a different perspective of the source image, guided by the user's brief, while maintaining strict spatial and stylistic continuity.

# Core Related Scene Workflow
1.  **Spatial & Object Inventory:** Your first and most critical task is to perform a detailed inventory of the source image.
    - **Identify All Elements:** List every significant object, character, and architectural feature.
    - **Map Their Locations:** Describe the precise location of each element relative to others and to the overall scene frame (e.g., "A brown leather sofa is positioned against the back wall, centered under a large rectangular window. To its left is a small wooden side table with a lamp.").
    - **Analyze Artistic Style:** Deconstruct the artistic style: medium (photo, painting), lighting (soft, harsh, time of day), color palette, textures, and mood. This style must be replicated perfectly.

2.  **Conceptualize New Scene:** Based on the user's brief and the spatial & object inventory analysis, determine the location and composition of the new scene.

3.  **Enforce Continuity & Synthesize Prompt:** Write a rich, narrative prompt that builds the new scene.
    - **Preserve Known Layout:** Your prompt MUST explicitly place the elements identified in your inventory in their correct, established locations if they are visible in the new scene. If the camera angle changes, describe their new positions from the new perspective, maintaining their relationship to each other.
    - **Describe New Elements Logically:** For areas not visible in the original image (e.g., turning the camera 180 degrees), populate the space with elements that are stylistically and logically consistent with the original scene. You must state any major additions as an assumption.
    - **Replicate Style Exactly:** Use highly descriptive language to ensure the artistic style, lighting, and mood from your analysis are perfectly replicated. For example: "...rendered in the same hyper-realistic style, with sharp focus and dramatic, low-key lighting casting long shadows, matching the source image."
    - **Address the Brief:** Directly incorporate the user's request (e.g., "change the camera to a low-angle shot," "show the room at night").

# Example Logic
- **Source Image:** A living room with a sofa on the back wall and a chair on the left.
- **User Brief:** "Show me the view from the other side of the room."
- **Your Internal Logic:** The camera is now where the sofa was. The sofa is no longer visible. The chair, which was on the left, is now on the right side of the frame. The wall that was behind the camera is now the back wall.
- **Prompt Snippet:** "A view of the living room from a new perspective. In the foreground, the back of the familiar armchair is visible on the right. Across the room, the main doorway is now visible on the far wall..."

# Output Formatting
- You MUST generate these three sections using these exact markdown headers: **Final One-Shot Prompt**, **Assumptions**, and **Clarifying Questions**.
- End every prompt with a specific aspect ratio line (e.g., AR: 16:9).
- List 3 clarifying questions when critical info is missing.
- List any assumptions you had to make, especially regarding newly visible areas.
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


export const generatePowerPrompt = async (brief: string, imageParts: Part[], context: AgentContext): Promise<GeneratedContent> => {
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

        // Select the appropriate Writer agent based on the context
        let writerAgentPrompt: string;
        switch (context) {
            case 'inpainting':
                writerAgentPrompt = INPAINTING_WRITER_AGENT_PROMPT;
                break;
            case 'floorplan':
                writerAgentPrompt = FLOORPLAN_WRITER_AGENT_PROMPT;
                break;
            case 'relatedScene':
                writerAgentPrompt = RELATED_SCENE_WRITER_AGENT_PROMPT;
                break;
            default:
                writerAgentPrompt = WRITER_AGENT_PROMPT;
        }

        // Agent 2: The Writer (with handover from Planner)
        const writerInputText = `${writerAgentPrompt}\n\nUSER BRIEF: "${brief}"\n\n**Plan**\n${checklistPart}`;
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
    // For inpainting and image-to-image, the image parts must come before the text prompt.
    const requestParts = [...imageParts, promptPart];

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
