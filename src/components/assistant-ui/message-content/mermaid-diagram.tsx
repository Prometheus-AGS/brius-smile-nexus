/**
 * Mermaid diagram component with rendering and copy functionality
 * Uses mermaid library for diagram rendering with theme support
 */

import React, { memo, useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MermaidCopyButton } from './copy-button';
import { useTheme } from '@/hooks/use-theme';
import type { MermaidDiagramProps } from '@/types/assistant';
import type { CopyResult } from '@/types/content-types';
import { cn } from '@/lib/utils';

/**
 * Mermaid theme configuration
 */
const getMermaidTheme = (isDark: boolean) => ({
  theme: (isDark ? 'dark' : 'default') as 'dark' | 'default' | 'forest' | 'neutral' | 'base' | 'null',
  themeVariables: {
    primaryColor: isDark ? '#3b82f6' : '#2563eb',
    primaryTextColor: isDark ? '#f8fafc' : '#1e293b',
    primaryBorderColor: isDark ? '#475569' : '#cbd5e1',
    lineColor: isDark ? '#64748b' : '#475569',
    secondaryColor: isDark ? '#1e293b' : '#f1f5f9',
    tertiaryColor: isDark ? '#334155' : '#e2e8f0',
    background: isDark ? '#0f172a' : '#ffffff',
    mainBkg: isDark ? '#1e293b' : '#ffffff',
    secondBkg: isDark ? '#334155' : '#f8fafc',
    tertiaryBkg: isDark ? '#475569' : '#f1f5f9'
  }
});

/**
 * Mermaid diagram types for display
 */
const DIAGRAM_TYPES: Record<string, string> = {
  flowchart: 'Flowchart',
  sequenceDiagram: 'Sequence Diagram',
  classDiagram: 'Class Diagram',
  stateDiagram: 'State Diagram',
  erDiagram: 'ER Diagram',
  journey: 'User Journey',
  gantt: 'Gantt Chart',
  pie: 'Pie Chart',
  gitgraph: 'Git Graph',
  mindmap: 'Mind Map',
  timeline: 'Timeline',
  quadrantChart: 'Quadrant Chart',
  requirement: 'Requirement Diagram',
  c4Context: 'C4 Context Diagram'
};

/**
 * Detect diagram type from mermaid code
 */
const detectDiagramType = (code: string): string => {
  const trimmedCode = code.trim().toLowerCase();
  
  if (trimmedCode.startsWith('graph') || trimmedCode.startsWith('flowchart')) {
    return 'flowchart';
  }
  if (trimmedCode.startsWith('sequencediagram')) {
    return 'sequenceDiagram';
  }
  if (trimmedCode.startsWith('classdiagram')) {
    return 'classDiagram';
  }
  if (trimmedCode.startsWith('statediagram')) {
    return 'stateDiagram';
  }
  if (trimmedCode.startsWith('erdiagram')) {
    return 'erDiagram';
  }
  if (trimmedCode.startsWith('journey')) {
    return 'journey';
  }
  if (trimmedCode.startsWith('gantt')) {
    return 'gantt';
  }
  if (trimmedCode.startsWith('pie')) {
    return 'pie';
  }
  if (trimmedCode.startsWith('gitgraph')) {
    return 'gitgraph';
  }
  if (trimmedCode.startsWith('mindmap')) {
    return 'mindmap';
  }
  if (trimmedCode.startsWith('timeline')) {
    return 'timeline';
  }
  if (trimmedCode.startsWith('quadrantchart')) {
    return 'quadrantChart';
  }
  if (trimmedCode.startsWith('requirementdiagram')) {
    return 'requirement';
  }
  if (trimmedCode.startsWith('c4context')) {
    return 'c4Context';
  }
  
  return 'flowchart'; // Default fallback
};

/**
 * Mermaid diagram component
 */
export const MermaidDiagram: React.FC<MermaidDiagramProps> = memo(({
  code,
  theme,
  onCopy,
  className
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const { theme: currentTheme } = useTheme();
  
  // Determine if we should use dark theme
  const isDark = theme === 'dark' || (!theme && currentTheme === 'dark');
  
  // Detect diagram type
  const diagramType = detectDiagramType(code);
  const diagramDisplayName = DIAGRAM_TYPES[diagramType] || 'Diagram';

  /**
   * Initialize and configure Mermaid
   */
  useEffect(() => {
    const initializeMermaid = async () => {
      try {
        // Configure mermaid with theme
        mermaid.initialize({
          startOnLoad: false,
          ...getMermaidTheme(isDark),
          securityLevel: 'loose', // Allow HTML in labels
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          fontSize: 14,
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: 'basis'
          },
          sequence: {
            useMaxWidth: true,
            wrap: true,
            width: 150,
            height: 65
          },
          gantt: {
            useMaxWidth: true,
            leftPadding: 75,
            gridLineStartPadding: 35
          }
        });
        
        setError(null);
      } catch (err) {
        console.error('Failed to initialize Mermaid:', err);
        setError('Failed to initialize diagram renderer');
      }
    };

    initializeMermaid();
  }, [isDark]);

  /**
   * Render the mermaid diagram
   */
  useEffect(() => {
    const renderDiagram = async () => {
      if (!containerRef.current || !code.trim()) return;

      setIsLoading(true);
      setError(null);

      try {
        // Clear previous content
        containerRef.current.innerHTML = '';
        
        // Generate unique ID for this diagram
        const diagramId = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Validate and render the diagram
        const { svg } = await mermaid.render(diagramId, code);
        
        // Insert the SVG into the container
        containerRef.current.innerHTML = svg;
        
        // Apply responsive styling to the SVG
        const svgElement = containerRef.current.querySelector('svg');
        if (svgElement) {
          svgElement.style.maxWidth = '100%';
          svgElement.style.height = 'auto';
          svgElement.style.display = 'block';
          svgElement.style.margin = '0 auto';
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        setError(err instanceof Error ? err.message : 'Failed to render diagram');
        setIsLoading(false);
      }
    };

    renderDiagram();
  }, [code, isDark]);

  /**
   * Handle copy result feedback
   */
  const handleCopyResult = useCallback((result: CopyResult) => {
    if (result.success) {
      setCopyFeedback('Copied!');
      setTimeout(() => setCopyFeedback(null), 2000);
    } else {
      setCopyFeedback('Failed to copy');
      setTimeout(() => setCopyFeedback(null), 3000);
    }
    
    // Call onCopy with the result if provided
    if (onCopy) {
      onCopy(result.success ? 'success' : 'error');
    }
  }, [onCopy]);

  /**
   * Render error state
   */
  if (error) {
    return (
      <Card className={cn('relative border-destructive/50', className)}>
        <div className="flex items-center justify-between px-4 py-2 border-b bg-destructive/10">
          <Badge variant="destructive" className="text-xs">
            Diagram Error
          </Badge>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2 text-destructive">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm font-medium">Failed to render diagram</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
          <details className="mt-3">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
              Show diagram code
            </summary>
            <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-x-auto">
              <code>{code}</code>
            </pre>
          </details>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn('relative group overflow-hidden', className)}>
      {/* Header with diagram type and copy button */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <Badge variant="secondary" className="text-xs">
          {diagramDisplayName}
        </Badge>
        
        <div className="flex items-center gap-2">
          {copyFeedback && (
            <span className={cn(
              'text-xs font-medium transition-colors',
              copyFeedback === 'Copied!' ? 'text-green-600' : 'text-red-600'
            )}>
              {copyFeedback}
            </span>
          )}
          <MermaidCopyButton
            code={code}
            title={diagramDisplayName}
            onCopy={handleCopyResult}
          />
        </div>
      </div>

      {/* Diagram content */}
      <div className="relative">
        {isLoading && (
          <div className="flex items-center justify-center p-8">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
              <span className="text-sm">Rendering diagram...</span>
            </div>
          </div>
        )}
        
        <div
          ref={containerRef}
          className={cn(
            'mermaid-container p-4 overflow-x-auto',
            isLoading && 'hidden'
          )}
          style={{
            minHeight: isLoading ? 0 : '100px'
          }}
        />
      </div>

      {/* Diagram info for large diagrams */}
      {!isLoading && !error && (
        <div className="absolute bottom-2 right-2 opacity-50">
          <Badge variant="outline" className="text-xs">
            {diagramDisplayName}
          </Badge>
        </div>
      )}
    </Card>
  );
});

MermaidDiagram.displayName = 'MermaidDiagram';

/**
 * Inline mermaid component for smaller diagrams
 */
export const InlineMermaidDiagram: React.FC<{
  code: string;
  className?: string;
}> = memo(({ code, className }) => {
  return (
    <div className={cn('inline-block', className)}>
      <MermaidDiagram
        code={code}
        className="max-w-sm"
      />
    </div>
  );
});

InlineMermaidDiagram.displayName = 'InlineMermaidDiagram';

export default MermaidDiagram;