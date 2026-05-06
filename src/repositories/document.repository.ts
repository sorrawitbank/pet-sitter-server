import { and, eq } from "drizzle-orm";
import db from "../db/db";
import { ragDocuments } from "../db/schema";
import { DocumentMetadata } from "../types/chat";

const DocumentRepository = {
  createSitterDocument: async (
    sitterId: number,
    contents: string[],
    embeddings: number[][],
    metadata: DocumentMetadata,
  ) => {
    await db.insert(ragDocuments).values(
      contents.map((content, index) => ({
        sourceTable: "pet_sitters",
        sourceId: String(sitterId),
        content,
        embedding: embeddings[index],
        metadata,
      })),
    );
  },

  deleteSitterDocument: async (sitterId: number) => {
    await db
      .delete(ragDocuments)
      .where(
        and(
          eq(ragDocuments.sourceTable, "pet_sitters"),
          eq(ragDocuments.sourceId, String(sitterId)),
        ),
      );
  },
};

export default DocumentRepository;
