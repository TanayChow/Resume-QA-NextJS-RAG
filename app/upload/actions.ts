"use server"

import { PDFParse } from "pdf-parse";
import {generateEmbeddings} from "../../embeddings";
import {chunkContent} from "../../chunking";
import {db} from "../../db-config";
import {documents} from "../../db-schema";


export async function processPDFFile(formData: FormData) {
    try {
        const file = formData.get("pdf") as File;
        if (!file) {
            throw new Error("No file uploaded");
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const parser = new PDFParse({ data: buffer });

	    const result = await parser.getText();
        const content = result.text;

        if(!content) {
            return {
            success: false,
            error: "No text content found in PDF"
        };
        }
        // Chunk the content
        const chunks = await chunkContent(content);

        // Generate embeddings for each chunk
        const embeddings = await generateEmbeddings(chunks);

        const records = chunks.map((chunk, index) => ({
            content: chunk,
            embedding: embeddings[index],
        }));
        // Insert into the database
        console.log("Inserting records into the database:");
        await db.insert(documents).values(records);

        return {
            success: true,
            message: "PDF processed and data stored successfully"
        }

        
    }   catch (error) {
            return {
            success: false,
            error: (error as Error).message || "An error occurred while processing the PDF"
        };
    }
}
