'use client';

import { useErrors } from '@/stores/error-store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export function ErrorPagerPopup() {
  const { errors, isPopupOpen, hideAllErrors, clearErrors, removeError } =
    useErrors();

  if (!isPopupOpen) {
    return null;
  }

  return (
    <Dialog open={isPopupOpen} onOpenChange={hideAllErrors}>
      <DialogContent className="max-w-4xl h-3/4 flex flex-col">
        <DialogHeader>
          <DialogTitle>Application Errors ({errors.length})</DialogTitle>
        </DialogHeader>
        <div className="flex-grow overflow-hidden">
          <Tabs defaultValue={errors[errors.length - 1]?.id} className="flex flex-col h-full">
            <div className="flex-shrink-0">
              <ScrollArea className="w-full">
                <TabsList className="p-2 h-auto">
                  {errors.map(e => (
                    <TabsTrigger
                      key={e.id}
                      value={e.id}
                      className="flex flex-col h-auto items-start p-2"
                    >
                      <div className="font-semibold truncate w-full">
                        {e.error.name}
                      </div>
                      <div className="text-xs text-muted-foreground w-full text-left truncate">
                        {e.error.message}
                      </div>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </ScrollArea>
            </div>
            <div className="flex-grow overflow-auto">
              {errors.map(e => (
                <TabsContent key={e.id} value={e.id} className="p-4 h-full">
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <Badge variant="destructive">{e.error.name}</Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(e.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeError(e.id)}
                      >
                        Dismiss
                      </Button>
                    </div>
                    <div className="flex-grow overflow-auto">
                      <ScrollArea className="h-full pr-4">
                        <div className="mb-4">
                          <h3 className="font-semibold mb-1">Message</h3>
                          <p className="text-sm bg-muted p-2 rounded">
                            {e.error.message}
                          </p>
                        </div>
                        {e.error.stack && (
                          <div className="mb-4">
                            <h3 className="font-semibold mb-1">Stack Trace</h3>
                            <pre className="text-xs bg-muted p-2 rounded-md overflow-auto">
                              <code>{e.error.stack}</code>
                            </pre>
                          </div>
                        )}
                        {e.errorInfo?.componentStack && (
                          <div>
                            <h3 className="font-semibold mb-1">
                              Component Stack
                            </h3>
                            <pre className="text-xs bg-muted p-2 rounded-md overflow-auto">
                              <code>{e.errorInfo.componentStack}</code>
                            </pre>
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  </div>
                </TabsContent>
              ))}
            </div>
          </Tabs>
        </div>
        <DialogFooter>
          <Button variant="destructive" onClick={clearErrors}>
            Clear All Errors ({errors.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}