
import { GoogleGenAI } from "@google/genai";

const apiKey = "AIzaSyCb_kP-zo7r7o3RVJcYsuA77rJF-EvK-AE";
const ai = new GoogleGenAI({ apiKey });

async function listModels() {
    try {
        const response = await ai.models.list();
        console.log("Available Models:");
        for (const model of response.models) {
            console.log(`- ${model.name} (${model.displayName})`);
        }
    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
