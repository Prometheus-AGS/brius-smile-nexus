/**
 * Custom hook for clipboard operations with feedback and error handling
 * Provides a clean interface for copy-to-clipboard functionality
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { ClipboardService } from '@/services/clipboard-service';
import type { CopyResult, CopyType, CopyFeedbackConfig } from '@/types/content-types';

/**
 * Configuration for the clipboard hook
 */
interface UseClipboardConfig {
  feedback?: CopyFeedbackConfig;
  onSuccess?: (result: CopyResult) => void;
  onError?: (result: CopyResult) => void;
}

/**
 * Return type for the clipboard hook
 */
interface UseClipboardReturn {
  copy: (content: string, type?: CopyType) => Promise<CopyResult>;
  copyCode: (code: string, language?: string) => Promise<CopyResult>;
  copyMermaid: (code: string, title?: string) => Promise<CopyResult>;
  copyFullMessage: (content: string) => Promise<CopyResult>;
  isSupported: boolean;
  lastResult: CopyResult | null;
  isLoading: boolean;
}

/**
 * Default feedback configuration
 */
const DEFAULT_FEEDBACK: CopyFeedbackConfig = {
  showToast: true,
  toastDuration: 2000,
  successMessage: 'Copied to clipboard',
  errorMessage: 'Failed to copy to clipboard'
};

/**
 * Custom hook for clipboard operations
 */
export const useClipboard = (config: UseClipboardConfig = {}): UseClipboardReturn => {
  const [lastResult, setLastResult] = useState<CopyResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const feedbackConfig = { ...DEFAULT_FEEDBACK, ...config.feedback };

  /**
   * Show feedback based on copy result
   */
  const showFeedback = useCallback((result: CopyResult) => {
    if (!feedbackConfig.showToast) return;

    if (result.success) {
      const message = getSuccessMessage(result.type, feedbackConfig.successMessage);
      toast.success(message, {
        duration: feedbackConfig.toastDuration
      });
    } else {
      const message = result.error || feedbackConfig.errorMessage || 'Failed to copy';
      toast.error(message, {
        duration: feedbackConfig.toastDuration
      });
    }
  }, [feedbackConfig]);

  /**
   * Handle copy result and trigger callbacks
   */
  const handleResult = useCallback((result: CopyResult) => {
    setLastResult(result);
    showFeedback(result);

    if (result.success && config.onSuccess) {
      config.onSuccess(result);
    } else if (!result.success && config.onError) {
      config.onError(result);
    }

    return result;
  }, [config.onSuccess, config.onError, showFeedback]);

  /**
   * Generic copy function
   */
  const copy = useCallback(async (content: string, type: CopyType = 'text'): Promise<CopyResult> => {
    setIsLoading(true);
    
    try {
      const result = await ClipboardService.copyText(content, type);
      return handleResult(result);
    } catch (error) {
      const errorResult: CopyResult = {
        success: false,
        type,
        content,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      return handleResult(errorResult);
    } finally {
      setIsLoading(false);
    }
  }, [handleResult]);

  /**
   * Copy code with language-specific formatting
   */
  const copyCode = useCallback(async (code: string, language?: string): Promise<CopyResult> => {
    setIsLoading(true);
    
    try {
      const result = await ClipboardService.copyCode(code, language);
      return handleResult(result);
    } catch (error) {
      const errorResult: CopyResult = {
        success: false,
        type: 'code',
        content: code,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      return handleResult(errorResult);
    } finally {
      setIsLoading(false);
    }
  }, [handleResult]);

  /**
   * Copy Mermaid diagram
   */
  const copyMermaid = useCallback(async (code: string, title?: string): Promise<CopyResult> => {
    setIsLoading(true);
    
    try {
      const result = await ClipboardService.copyMermaid(code, title);
      return handleResult(result);
    } catch (error) {
      const errorResult: CopyResult = {
        success: false,
        type: 'mermaid',
        content: code,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      return handleResult(errorResult);
    } finally {
      setIsLoading(false);
    }
  }, [handleResult]);

  /**
   * Copy full message content
   */
  const copyFullMessage = useCallback(async (content: string): Promise<CopyResult> => {
    setIsLoading(true);
    
    try {
      const result = await ClipboardService.copyFullMessage(content);
      return handleResult(result);
    } catch (error) {
      const errorResult: CopyResult = {
        success: false,
        type: 'full',
        content,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      return handleResult(errorResult);
    } finally {
      setIsLoading(false);
    }
  }, [handleResult]);

  return {
    copy,
    copyCode,
    copyMermaid,
    copyFullMessage,
    isSupported: ClipboardService.isSupported(),
    lastResult,
    isLoading
  };
};

/**
 * Get success message based on copy type
 */
function getSuccessMessage(type: CopyType, defaultMessage?: string): string {
  const messages: Record<CopyType, string> = {
    text: 'Text copied to clipboard',
    code: 'Code copied to clipboard',
    mermaid: 'Diagram copied to clipboard',
    full: 'Message copied to clipboard'
  };

  return messages[type] || defaultMessage || 'Copied to clipboard';
}

/**
 * Hook for simple text copying with minimal configuration
 */
export const useSimpleClipboard = () => {
  const { copy, isSupported, isLoading } = useClipboard({
    feedback: {
      showToast: true,
      successMessage: 'Copied!',
      errorMessage: 'Copy failed'
    }
  });

  return {
    copy: (text: string) => copy(text, 'text'),
    isSupported,
    isLoading
  };
};

/**
 * Hook for code copying with syntax-aware feedback
 */
export const useCodeClipboard = () => {
  const { copyCode, isSupported, isLoading } = useClipboard({
    feedback: {
      showToast: true,
      successMessage: 'Code copied!',
      errorMessage: 'Failed to copy code'
    }
  });

  return {
    copyCode,
    isSupported,
    isLoading
  };
};

/**
 * Hook for message copying with enhanced feedback
 */
export const useMessageClipboard = () => {
  const { copyFullMessage, isSupported, isLoading } = useClipboard({
    feedback: {
      showToast: true,
      successMessage: 'Message copied!',
      errorMessage: 'Failed to copy message'
    }
  });

  return {
    copyMessage: copyFullMessage,
    isSupported,
    isLoading
  };
};

export default useClipboard;