// src/app/chat/page.tsx
"use client";

import { Fragment, useState } from "react";
import { useChat } from "@ai-sdk/react";
import Link from "next/link";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { KnowledgeBaseResults } from "@/components/ai-elements/knowledge-base-results";

//This page utilizes the useChat hook, which will, by default, 
// use the POST API route you created earlier (/api/chat). 
// The hook provides functions and state for handling user input 
// and form submission. The useChat hook provides multiple utility 
// functions and state variables:
// messages - the current chat messages (an array of objects with id, role, and parts properties).
// sendMessage - a function to send a message to the chat API.
export default function RAGChatBot() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat();

  const handleSubmit = (message: PromptInputMessage) => {
    if (!message.text) {
      return;
    }
    sendMessage({ text: message.text}); // this will trigger the POST API route at /api/chat, sending the user's message to the backend for processing.
    setInput("");
  };

  return (
    <div className="max-w-4xl mx-auto p-6 relative size-full h-[calc(100vh-4rem)]">
      <div className="flex flex-col h-full">
        <Conversation className="h-full">
          <ConversationContent>
            {messages.length === 0 ? (
              <ConversationEmptyState
                title="Ask anything about your documents"
                description="Upload a document first, then ask questions about its content."
              >
                <div className="space-y-1 text-center">
                  <h3 className="font-medium text-sm">Ask anything about your documents</h3>
                  <p className="text-muted-foreground text-sm">
                    No documents yet?{" "}
                    <Link href="/upload" className="underline underline-offset-2 hover:text-foreground transition-colors">
                      Upload one here
                    </Link>
                  </p>
                </div>
              </ConversationEmptyState>
            ) : (
              messages.map((message) => (
                <div key={message.id}>
                  {message.parts.map((part, i) => {
                    switch (part.type) {
                      case "text":
                        return (
                          <Fragment key={`${message.id}-${i}`}>
                            <Message from={message.role}>
                              <MessageContent>
                                <MessageResponse>{part.text}</MessageResponse>
                              </MessageContent>
                            </Message>
                          </Fragment>
                        );
                      case "tool-searchKnowledgeBase":
                        return (
                          <KnowledgeBaseResults
                            key={`${message.id}-${i}`}
                            output={part.state === "output-available" ? String(part.output) : ""}
                          />
                        );
                      default:
                        return null;
                    }
                  })}
                </div>
              ))
            )}
            {(status === "submitted" || status === "streaming") && <span className="text-sm text-gray-500">Loading...</span>}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <PromptInput onSubmit={handleSubmit} className="mt-4">
          <PromptInputBody>
            <PromptInputTextarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </PromptInputBody>

            <PromptInputSubmit disabled={!input && !status} status={status} />

        </PromptInput>
      </div>
    </div>
  );
}