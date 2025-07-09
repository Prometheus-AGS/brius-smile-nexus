/**
 * Chat History Search Component
 * Provides search and category filtering functionality for chat history
 */

import { memo, useCallback } from 'react';
import { Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface CategoryOption {
  value: 'all' | 'analytics' | 'support' | 'general';
  label: string;
}

export interface ChatHistorySearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: 'all' | 'analytics' | 'support' | 'general';
  onCategoryChange: (category: 'all' | 'analytics' | 'support' | 'general') => void;
  className?: string;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  { value: 'all', label: 'All Chats' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'support', label: 'Support' },
  { value: 'general', label: 'General' },
];

/**
 * Chat history search and filter component
 */
export const ChatHistorySearch = memo<ChatHistorySearchProps>(({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  className = '',
}) => {
  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onSearchChange(event.target.value);
    },
    [onSearchChange]
  );

  const handleCategoryChange = useCallback(
    (value: string) => {
      onCategoryChange(value as 'all' | 'analytics' | 'support' | 'general');
    },
    [onCategoryChange]
  );

  const clearSearch = useCallback(() => {
    onSearchChange('');
  }, [onSearchChange]);

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search chat history..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
            aria-label="Clear search"
          >
            ×
          </Button>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={selectedCategory} onValueChange={handleCategoryChange}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
});

ChatHistorySearch.displayName = 'ChatHistorySearch';