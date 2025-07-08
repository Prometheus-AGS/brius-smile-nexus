/**
 * WelcomeSuggestions component that displays clickable suggestion cards
 * Helps users get started with business intelligence queries and use cases
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  AlertTriangle, 
  DollarSign,
  Sparkles 
} from 'lucide-react';
import type { WelcomeSuggestionsProps } from '@/types/assistant';
import { cn } from '@/lib/utils';

/**
 * Business Intelligence Welcome Suggestions
 * Focused on business analytics, performance metrics, and operational insights
 */
const BUSINESS_SUGGESTIONS = [
  {
    id: 'order-analytics',
    text: 'Order Analytics & Trends',
    prompt: 'Show me our order volume trends for this year and analyze our performance compared to last quarter',
    icon: BarChart3,
    category: 'analytics'
  },
  {
    id: 'technician-performance',
    text: 'Technician Performance Review',
    prompt: 'Are there any technician performance issues I should know about? Show me efficiency metrics and customer ratings',
    icon: Users,
    category: 'performance'
  },
  {
    id: 'customer-complaints',
    text: 'Customer Complaint Analysis',
    prompt: 'What customer complaints have we received recently? Analyze patterns and severity levels',
    icon: AlertTriangle,
    category: 'customer'
  },
  {
    id: 'operational-risks',
    text: 'Operational Risk Assessment',
    prompt: 'What operational risks might impact our bottom line? Show me current risk factors and mitigation strategies',
    icon: AlertTriangle,
    category: 'risk'
  },
  {
    id: 'revenue-analysis',
    text: 'Revenue Performance',
    prompt: 'How is our revenue performing compared to last quarter? Break down by service type and show growth trends',
    icon: DollarSign,
    category: 'revenue'
  },
  {
    id: 'business-insights',
    text: 'Business Intelligence Dashboard',
    prompt: 'Give me a comprehensive overview of our business performance including key metrics, trends, and actionable insights',
    icon: TrendingUp,
    category: 'dashboard'
  }
];

/**
 * WelcomeSuggestions component displays a grid of business intelligence suggestion cards
 */
export const WelcomeSuggestions: React.FC<WelcomeSuggestionsProps> = ({
  suggestions,
  onSuggestionClick,
  className
}) => {
  // Use business suggestions if no custom suggestions provided
  const displaySuggestions = suggestions && suggestions.length > 0 
    ? suggestions 
    : BUSINESS_SUGGESTIONS.map(s => ({
        id: s.id,
        text: s.text,
        prompt: s.prompt
      }));

  if (!displaySuggestions || displaySuggestions.length === 0) {
    return null;
  }

  return (
    <div className={cn('w-full', className)}>
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Business Intelligence Assistant</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Get insights into your business performance and operations
        </p>
      </div>

      {/* Suggestions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {displaySuggestions.map((suggestion, index) => {
          // Get corresponding business suggestion for icon
          const businessSuggestion = BUSINESS_SUGGESTIONS.find(s => s.id === suggestion.id);
          const IconComponent = businessSuggestion?.icon || BarChart3;
          
          return (
            <Card
              key={suggestion.id}
              className="group cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] border-2 hover:border-primary/20"
              onClick={() => onSuggestionClick(suggestion.prompt)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <IconComponent className="h-4 w-4 text-primary" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm mb-1 group-hover:text-primary transition-colors">
                      {suggestion.text}
                    </h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {suggestion.prompt}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Alternative Button Layout for smaller screens */}
      <div className="md:hidden mt-4 space-y-2">
        {displaySuggestions.map((suggestion, index) => {
          const businessSuggestion = BUSINESS_SUGGESTIONS.find(s => s.id === suggestion.id);
          const IconComponent = businessSuggestion?.icon || BarChart3;
          
          return (
            <Button
              key={`btn-${suggestion.id}`}
              variant="outline"
              className="w-full justify-start h-auto p-3 text-left"
              onClick={() => onSuggestionClick(suggestion.prompt)}
            >
              <div className="flex items-center gap-3">
                <IconComponent className="h-4 w-4 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{suggestion.text}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {suggestion.prompt}
                  </div>
                </div>
              </div>
            </Button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="text-center mt-6">
        <p className="text-xs text-muted-foreground">
          Or ask your own business intelligence question in the input below
        </p>
      </div>
    </div>
  );
};

export default WelcomeSuggestions;