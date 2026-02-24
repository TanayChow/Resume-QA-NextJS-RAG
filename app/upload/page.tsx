"use client"

import { useState } from "react";
import { processPDFFile } from "./actions";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

export default function PDFUpload() {
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState<{type: "success" | "error", text: string}[]>([]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setMessages([]);

    try {
      const formData = new FormData();
      formData.append("pdf", file);

      const result = await processPDFFile(formData);

      if (result.success) {
        setMessages(prev => [...prev, {
          type: "success",
          text: result.message || "PDF processed successfully",
        }]);
        e.target.value = "";
      } else {
        setMessages(prev => [...prev, {
          type: "error",
          text: result.error || "Failed to process PDF",
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        type: "error",
        text: "An error occurred while processing the PDF",
      }]);
    } finally {
      setIsLoading(false);
    }
  };
    
    return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          PDF Upload
        </h1>
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="pdf-upload">Upload PDF File</Label>
                <Input
                  id="pdf-upload"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  disabled={isLoading}
                  className="mt-2"
                />
              </div>

              {isLoading && (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-muted-foreground">
                    Processing PDF...
                  </span>
                </div>
              )}

              {messages.length > 0 && (
                <Alert
                  variant={messages[messages.length - 1].type === "error" ? "destructive" : "default"}
                >
                  <AlertTitle>
                    {messages[messages.length - 1].type === "error" ? "Error!" : "Success!"}
                  </AlertTitle>
                  <AlertDescription>{messages[messages.length - 1].text}</AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}