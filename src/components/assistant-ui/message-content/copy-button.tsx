/**
 * Copy button component with visual feedback and accessibility support
 * Provides consistent copy-to-clipboard functionality across the application
 */

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Copy, Check, AlertCircle } from 'lucide-react';
import { useClipboard } from '@/hooks/use-clipboard';
import type { CopyButtonProps } from '@/types/assistant';
import { cn } from '@/lib/utils';

/**
 * Copy button component with enhanced UX
 */
export const CopyButton: React.FC<CopyButtonProps> = ({
  content,
  type,
  onCopy,
  className,
  variant = 'ghost',
  size = 'sm',
  showOnHover = true
}) => {
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  
  const { copy, isLoading } = useClipboard({
    feedback: {
      showToast: false // We'll handle feedback with button state
    },
    onSuccess: (result) => {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      onCopy?.(result);
    },
    onError: (result) => {
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
      onCopy?.(result);
    }
  });

  const handleCopy = useCallback(async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (isLoading) return;
    
    await copy(content, type);
  }, [copy, content, type, isLoading]);

  const getIcon = () => {
    if (showError) return <AlertCircle className="h-3 w-3" />;
    if (showSuccess) return <Check className="h-3 w-3" />;
    return <Copy className="h-3 w-3" />;
  };

  const getTooltipText = () => {
    if (showError) return 'Failed to copy';
    if (showSuccess) return 'Copied!';
    
    const typeLabels = {
      text: 'Copy text',
      code: 'Copy code',
      mermaid: 'Copy diagram',
      full: 'Copy message'
    };
    
    return typeLabels[type] || 'Copy to clipboard';
  };

  const getButtonVariant = () => {
    if (showError) return 'destructive';
    if (showSuccess) return 'default';
    return variant;
  };

  const getButtonSize = () => {
    // Map our size prop to shadcn button sizes
    if (size === 'md') return 'default';
    return size;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={getButtonVariant()}
            size={getButtonSize()}
            onClick={handleCopy}
            disabled={isLoading}
            className={cn(
              'transition-all duration-200',
              showOnHover && 'opacity-0 group-hover:opacity-100',
              showSuccess && 'bg-green-100 text-green-700 hover:bg-green-200',
              showError && 'bg-red-100 text-red-700 hover:bg-red-200',
              className
            )}
            aria-label={getTooltipText()}
          >
            {getIcon()}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {getTooltipText()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

/**
 * Specialized copy button for code blocks
 */
export const CodeCopyButton: React.FC<{
  code: string;
  language?: string;
  className?: string;
  onCopy?: (result: import('@/types/content-types').CopyResult) => void;
}> = ({ code, language, className, onCopy }) => {
  return (
    <CopyButton
      content={code}
      type="code"
      onCopy={onCopy}
      className={cn('absolute top-2 right-2', className)}
      variant="secondary"
      size="sm"
      showOnHover={false}
    />
  );
};

/**
 * Specialized copy button for Mermaid diagrams
 */
export const MermaidCopyButton: React.FC<{
  code: string;
  title?: string;
  className?: string;
  onCopy?: (result: import('@/types/content-types').CopyResult) => void;
}> = ({ code, title, className, onCopy }) => {
  return (
    <CopyButton
      content={code}
      type="mermaid"
      onCopy={onCopy}
      className={cn('absolute top-2 right-2', className)}
      variant="secondary"
      size="sm"
      showOnHover={false}
    />
  );
};

/**
 * Specialized copy button for full messages
 */
export const MessageCopyButton: React.FC<{
  content: string;
  className?: string;
  onCopy?: (result: import('@/types/content-types').CopyResult) => void;
}> = ({ content, className, onCopy }) => {
  return (
    <CopyButton
      content={content}
      type="full"
      onCopy={onCopy}
      className={cn('opacity-0 group-hover:opacity-100', className)}
      variant="ghost"
      size="sm"
      showOnHover={true}
    />
  );
};

export default CopyButton;