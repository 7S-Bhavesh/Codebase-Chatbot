import { GoogleGenAI } from "@google/genai";
import { buildAugmentedPrompt } from "./augmenter.js";
import client from "../client/weaviate.client.js";
import { Filters } from 'weaviate-client';

export async function generation(query, email, repo_url) {
    try {
        if (!query) {
            return { error: "Query is required" };
        }
        const collection = client.collections.use('RepoCodeChunk');

        const result = await collection.query.nearText(query, {
            limit: 5,
            returnMetadata: ['distance'],
            filters: Filters.and(
                collection.filter.byProperty('userid').equal(email),
                collection.filter.byProperty('repourl').equal(repo_url)
            )
        })

        const prompt = buildAugmentedPrompt(query, result);
        const YOUR_API_KEY = process.env.GEMINI_API_KEY;

        const ai = new GoogleGenAI({ apiKey: YOUR_API_KEY });

        console.log(prompt);

        const llmResponse = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: prompt,
        });

        const finalAnswer = llmResponse.text;
        console.log(finalAnswer);

        return {
          success: true,
          answer: finalAnswer,
          model: "gemini-3.1-flash-lite",
        };
    } catch (err) {
        console.error("Falied to generate...", err);
        return {
            error: "Failed to generate...",
            details: process.env.NODE_ENV === "development" ? err.message : undefined
        };
    }
}

