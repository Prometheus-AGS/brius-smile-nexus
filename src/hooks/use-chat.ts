import { useChatRuntime } from "@assistant-ui/react-ai-sdk";

/**
 * Custom hook for chat runtime configuration
 * Provides the chat runtime instance for AI assistant interactions
 */
export const useChat = () => {
  const runtime = useChatRuntime({
    api: "http://localhost:4211/api/agents/database-agent/stream", // Replace 'chefAgent' with your agent's name
  });

  return runtime;
};
