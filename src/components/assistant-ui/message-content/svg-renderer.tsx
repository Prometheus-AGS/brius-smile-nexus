/**
 * SVG Renderer component for displaying SVG content as images in chat messages
 * Includes validation, sanitization, and user controls for copy/download functionality
 */

import React, { memo, useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useClipboard } from '@/hooks/use-clipboard';
import { useTheme } from '@/hooks/use-theme';
import type { SVGRendererProps, SVGValidationResult, SVGRendererState } from '@/types/assistant';
import type { CopyResult } from '@/types/content-types';
import { cn } from '@/lib/utils';
import { 
  Download, 
  Copy, 
  Code, 
  Image, 
  Maximize2, 
  AlertTriangle,
  Eye,
  EyeOff
} from 'lucide-react';

/**
 * SVG validation and sanitization utility
 */
const validateAndSanitizeSVG = (svgCode: string): SVGValidationResult => {
  try {
    // Basic SVG validation
    if (!svgCode.trim().startsWith('<svg')) {
      return {
        isValid: false,
        errors: ['Content does not appear to be valid SVG (must start with <svg tag)']
      };
    }

    // Create a DOM parser to validate XML structure
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgCode, 'image/svg+xml');
    
    // Check for parsing errors
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      return {
        isValid: false,
        errors: ['Invalid XML structure in SVG content']
      };
    }

    const svgElement = doc.querySelector('svg');
    if (!svgElement) {
      return {
        isValid: false,
        errors: ['No SVG element found in content']
      };
    }

    // Basic sanitization - remove potentially dangerous elements and attributes
    const dangerousElements = ['script', 'object', 'embed', 'iframe', 'link'];
    const dangerousAttributes = ['onload', 'onerror', 'onclick', 'onmouseover', 'onfocus'];
    
    let sanitizedSVG = svgCode;
    
    // Remove dangerous elements
    dangerousElements.forEach(element => {
      const regex = new RegExp(`<${element}[^>]*>.*?</${element}>`, 'gis');
      sanitizedSVG = sanitizedSVG.replace(regex, '');
    });
    
    // Remove dangerous attributes
    dangerousAttributes.forEach(attr => {
      const regex = new RegExp(`\\s${attr}\\s*=\\s*["'][^"']*["']`, 'gi');
      sanitizedSVG = sanitizedSVG.replace(regex, '');
    });

    // Remove external references (href, xlink:href starting with http)
    sanitizedSVG = sanitizedSVG.replace(/\s(?:xlink:)?href\s*=\s*["']https?:\/\/[^"']*["']/gi, '');

    // Extract dimensions if available
    const widthMatch = svgElement.getAttribute('width');
    const heightMatch = svgElement.getAttribute('height');
    const viewBoxMatch = svgElement.getAttribute('viewBox');
    
    let dimensions: { width: number; height: number } | undefined;
    
    if (widthMatch && heightMatch) {
      const width = parseFloat(widthMatch);
      const height = parseFloat(heightMatch);
      if (!isNaN(width) && !isNaN(height)) {
        dimensions = { width, height };
      }
    } else if (viewBoxMatch) {
      const viewBoxValues = viewBoxMatch.split(/\s+/);
      if (viewBoxValues.length === 4) {
        const width = parseFloat(viewBoxValues[2]);
        const height = parseFloat(viewBoxValues[3]);
        if (!isNaN(width) && !isNaN(height)) {
          dimensions = { width, height };
        }
      }
    }

    return {
      isValid: true,
      sanitizedSVG,
      dimensions,
      warnings: sanitizedSVG !== svgCode ? ['SVG content was sanitized for security'] : undefined
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [`SVG validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
};

/**
 * SVG Renderer Component
 */
export const SVGRenderer: React.FC<SVGRendererProps> = memo(({
  code,
  title,
  className,
  onCopy,
  showControls = true,
  maxWidth = '100%',
  maxHeight = '400px'
}) => {
  const { copy } = useClipboard();
  const { theme } = useTheme();
  const svgContainerRef = useRef<HTMLDivElement>(null);
  
  const [state, setState] = useState<SVGRendererState>({
    isLoading: true,
    error: null,
    isFullscreen: false,
    showCode: false
  });
  
  const [validationResult, setValidationResult] = useState<SVGValidationResult | null>(null);

  /**
   * Validate and process SVG content
   */
  useEffect(() => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    const result = validateAndSanitizeSVG(code);
    setValidationResult(result);
    
    if (!result.isValid) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: result.errors?.[0] || 'Invalid SVG content'
      }));
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [code]);

  /**
   * Handle copy functionality
   */
  const handleCopy = useCallback(async () => {
    const result = await copy(code, 'text');
    onCopy?.(result);
  }, [code, copy, onCopy]);

  /**
   * Handle download functionality
   */
  const handleDownload = useCallback(() => {
    if (!validationResult?.sanitizedSVG) return;
    
    const blob = new Blob([validationResult.sanitizedSVG], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title || 'svg-image'}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [validationResult?.sanitizedSVG, title]);

  /**
   * Toggle fullscreen view
   */
  const toggleFullscreen = useCallback(() => {
    setState(prev => ({ ...prev, isFullscreen: !prev.isFullscreen }));
  }, []);

  /**
   * Toggle code view
   */
  const toggleCodeView = useCallback(() => {
    setState(prev => ({ ...prev, showCode: !prev.showCode }));
  }, []);

  /**
   * Render SVG content
   */
  const renderSVG = useCallback((containerClassName?: string) => {
    if (!validationResult?.sanitizedSVG) return null;

    return (
      <div 
        ref={svgContainerRef}
        className={cn(
          'flex items-center justify-center overflow-hidden',
          containerClassName
        )}
        style={{ 
          maxWidth: state.isFullscreen ? '90vw' : maxWidth,
          maxHeight: state.isFullscreen ? '90vh' : maxHeight
        }}
        dangerouslySetInnerHTML={{ __html: validationResult.sanitizedSVG }}
      />
    );
  }, [validationResult?.sanitizedSVG, state.isFullscreen, maxWidth, maxHeight]);

  /**
   * Render error state
   */
  if (state.error) {
    return (
      <Card className={cn('relative', className)}>
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
          <Badge variant="destructive" className="text-xs font-mono">
            SVG Error
          </Badge>
        </div>
        <div className="p-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {state.error}
            </AlertDescription>
          </Alert>
          {showControls && (
            <div className="flex items-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleCodeView}
                className="flex items-center gap-2"
              >
                <Code className="h-4 w-4" />
                View Code
              </Button>
            </div>
          )}
        </div>
      </Card>
    );
  }

  /**
   * Render loading state
   */
  if (state.isLoading) {
    return (
      <Card className={cn('relative', className)}>
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
          <Badge variant="secondary" className="text-xs font-mono">
            SVG
          </Badge>
        </div>
        <div className="p-4 flex items-center justify-center min-h-[100px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className={cn('relative group overflow-hidden', className)}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs font-mono">
              SVG Image
            </Badge>
            {title && (
              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                {title}
              </span>
            )}
            {validationResult?.dimensions && (
              <Badge variant="outline" className="text-xs">
                {validationResult.dimensions.width}×{validationResult.dimensions.height}
              </Badge>
            )}
          </div>

          {showControls && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleCodeView}
                className="h-8 w-8 p-0"
                title={state.showCode ? "Show image" : "Show code"}
              >
                {state.showCode ? <Image className="h-4 w-4" /> : <Code className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                className="h-8 w-8 p-0"
                title="Fullscreen view"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-8 w-8 p-0"
                title="Copy SVG code"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                className="h-8 w-8 p-0"
                title="Download SVG"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Warnings */}
          {validationResult?.warnings && validationResult.warnings.length > 0 && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {validationResult.warnings.join(', ')}
              </AlertDescription>
            </Alert>
          )}

          {/* SVG or Code Display */}
          {state.showCode ? (
            <div className="bg-muted rounded-md p-4 overflow-x-auto">
              <pre className="text-sm font-mono whitespace-pre-wrap break-words">
                {code}
              </pre>
            </div>
          ) : (
            <div className="flex items-center justify-center bg-background rounded-md border min-h-[100px]">
              {renderSVG('w-full h-full')}
            </div>
          )}
        </div>
      </Card>

      {/* Fullscreen Dialog */}
      <Dialog open={state.isFullscreen} onOpenChange={toggleFullscreen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              {title || 'SVG Image'}
              {validationResult?.dimensions && (
                <Badge variant="outline" className="text-xs">
                  {validationResult.dimensions.width}×{validationResult.dimensions.height}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center bg-background rounded-md border min-h-[200px] overflow-auto">
            {renderSVG('max-w-full max-h-full')}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
});

SVGRenderer.displayName = 'SVGRenderer';

export default SVGRenderer;