/**
 * AssistantChat Component
 * 
 * Simple, working chat interface using our fixed useOpenAIChat hook
 */

import React, { useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Send, MessageSquare, Bot, Activity, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useOpenAIChat } from '@/hooks/use-openai-chat';

interface AssistantChatProps {
  className?: string;
}

export const AssistantChat: React.FC<AssistantChatProps> = ({ className }) => {
  // Authentication
  const { user } = useAuth();
  
  // Use our fixed OpenAI chat hook
  const { 
    messages, 
    input, 
    handleInputChange, 
    handleSubmit, 
    isLoading, 
    isStreaming,
    error,
    setInput,
    sendMessage
  } = useOpenAIChat(user);

  return (
    <div className={`flex flex-col h-full ${className || ''}`}>
      {/* Messages Area - scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {/* Error Display */}
        {error && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error.message || 'An error occurred while processing your request.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Messages or Welcome Screen */}
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <Bot className="h-12 w-12 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">Business Intelligence Assistant</h3>
              <p className="text-muted-foreground">
                Ask me about your business performance, analytics, and operational insights
              </p>
            </div>
            
            {/* Suggestion Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl">
              {[
                "How many orders did we get this month?",
                "Show me our top performing products",
                "What's our customer satisfaction trend?",
                "Analyze our production efficiency"
              ].map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="p-3 h-auto text-left justify-start"
                  onClick={() => {
                    if (sendMessage) {
                      sendMessage(suggestion);
                    }
                  }}
                >
                  <MessageSquare className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="text-sm">{suggestion}</span>
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div key={message.id} className="mb-4">
                <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  }`}>
                    <div className="text-sm font-medium mb-1 capitalize">
                      {message.role === 'user' ? 'You' : 'Assistant'}
                    </div>
                    <div className="whitespace-pre-wrap">
                      {message.content}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Activity className="h-4 w-4 animate-pulse" />
            <span>Processing your request...</span>
          </div>
        )}
      </div>

      {/* Input Form - pinned to bottom */}
      <div className="border-t p-4 bg-background flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask me anything about your dental manufacturing data..."
            disabled={isLoading}
            className="flex-1"
            autoFocus
          />
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            size="icon"
          >
            {isLoading ? (
              <Activity className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
        
        {/* Status */}
        <div className="flex items-center justify-center mt-2 text-xs text-muted-foreground">
          <span>All interactions are being tracked for analytics and improvement</span>
        </div>
      </div>
    </div>
  );
};

export default AssistantChat;
