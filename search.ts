import { cosineDistance, desc, sql, isNotNull } from "drizzle-orm"
import { documents } from "./db-schema";
import { generateEmbedding } from "./embeddings";
import { db } from "./db-config";

export async function searchSimilarDocuments(query: string, limit: number = 5, threshold: number = 0.5) {
    const queryEmbedding = await generateEmbedding(query);
    const similarity = sql<number>`1 - (${cosineDistance(documents.embedding, queryEmbedding)})`;

    const similarDocs = await db
        .select({
            id: documents.id,
            content: documents.content,
            similarity
        })
        .from(documents)
        .where(isNotNull(documents.embedding))
        .orderBy(desc(similarity))
        .limit(limit);

    // Filter by threshold in app code — preserves HNSW index usage via ORDER BY + LIMIT
    return similarDocs.filter(doc => doc.similarity >= threshold);
}