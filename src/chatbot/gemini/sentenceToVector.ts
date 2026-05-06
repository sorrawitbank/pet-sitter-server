import geminiClient from "./client";

const GEMINI_EMBEDDING_MODEL = "gemini-embedding-001";
const GEMINI_EMBEDDING_DIMENSION = 1536;

async function sentenceToVector(text: string): Promise<number[]> {
  if (!text || !text.trim()) {
    throw new Error("Text is required to create an embedding.");
  }

  const response = await geminiClient.models.embedContent({
    model: GEMINI_EMBEDDING_MODEL,
    contents: text,
    config: {
      outputDimensionality: GEMINI_EMBEDDING_DIMENSION,
      taskType: "RETRIEVAL_DOCUMENT",
    },
  });

  if (!response.embeddings) {
    throw new Error("Gemini did not return any embeddings.");
  }

  const values = response.embeddings[0].values;

  if (!values || values.length === 0) {
    throw new Error("Gemini did not return any embeddings.");
  }

  return values;
}

export default sentenceToVector;
