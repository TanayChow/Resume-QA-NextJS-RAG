import {cosineDistance, desc, gt, sql} from "drizzle-orm"
import { documents } from "./db-schema";
import { generateEmbedding } from "./embeddings";
import { db } from "./db-config";

// Function to search for similar documents based on cosine similarity
// 1. Generate embedding for the query
// 2. Calculate cosine similarity with document embeddings in the database
// 3. Filter the vector database and sort results based on similarity score
export async function searchSimilarDocuments(query: string, limit: number = 5, threshold: number = 0.5) {
    const queryEmbedding = await generateEmbedding(query);
    const similarity = sql<number>`1 - (${cosineDistance(documents.embedding, queryEmbedding)})`;
    // console.log("Query embedding generated, searching for similar documents...", similarity);
    const similarDocs = await db
        .select({
            id: documents.id,
            content: documents.content,
            similarity
        })
        .from(documents)
        // .where(
        //     gt(
        //         similarity,
        //         threshold
        //     )
        // )
        .orderBy(desc(similarity))
        .limit(limit);

        return similarDocs;
}