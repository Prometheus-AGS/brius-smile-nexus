import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EnhancedMessage } from '@/components/assistant-ui/message-content';

/**
 * SVG Test Page
 * 
 * This page demonstrates the SVG rendering functionality in chat messages.
 * It shows how SVG content is detected and rendered as images instead of code blocks.
 */
const SVGTestPage: React.FC = () => {
  // Sample SVG content that would typically come from AI responses
  const sampleSVGContent = `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
  <circle cx="100" cy="100" r="80" fill="#3b82f6" stroke="#1e40af" stroke-width="2"/>
  <text x="100" y="100" text-anchor="middle" dy="0.3em" fill="white" font-family="Arial" font-size="16">
    SVG Test
  </text>
</svg>`;

  const sampleDiagramSVG = `<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
  <rect x="20" y="20" width="80" height="40" fill="#10b981" stroke="#059669" stroke-width="2" rx="5"/>
  <text x="60" y="45" text-anchor="middle" fill="white" font-family="Arial" font-size="12">Start</text>
  
  <rect x="120" y="20" width="80" height="40" fill="#f59e0b" stroke="#d97706" stroke-width="2" rx="5"/>
  <text x="160" y="45" text-anchor="middle" fill="white" font-family="Arial" font-size="12">Process</text>
  
  <rect x="220" y="20" width="80" height="40" fill="#ef4444" stroke="#dc2626" stroke-width="2" rx="5"/>
  <text x="260" y="45" text-anchor="middle" fill="white" font-family="Arial" font-size="12">End</text>
  
  <line x1="100" y1="40" x2="120" y2="40" stroke="#374151" stroke-width="2" marker-end="url(#arrowhead)"/>
  <line x1="200" y1="40" x2="220" y2="40" stroke="#374151" stroke-width="2" marker-end="url(#arrowhead)"/>
  
  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="#374151"/>
    </marker>
  </defs>
</svg>`;

  // Mock message data that would typically come from the chat system
  const mockMessages = [
    {
      id: '1',
      role: 'assistant' as const,
      content: `Here's a simple SVG circle for you:

\`\`\`svg
${sampleSVGContent}
\`\`\`

This SVG should render as an actual image with user controls for copy, download, and fullscreen viewing.`,
      timestamp: new Date(),
    },
    {
      id: '2',
      role: 'assistant' as const,
      content: `Here's a workflow diagram:

\`\`\`svg
${sampleDiagramSVG}
\`\`\`

This demonstrates how complex SVG diagrams are rendered with proper security sanitization.`,
      timestamp: new Date(),
    },
    {
      id: '3',
      role: 'assistant' as const,
      content: `Here's SVG content without explicit language specification:

\`\`\`
${sampleSVGContent}
\`\`\`

This should also be detected and rendered as an SVG image due to content analysis.`,
      timestamp: new Date(),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>SVG Renderer Test Page</CardTitle>
            <CardDescription>
              This page demonstrates the SVG rendering functionality implemented for chat messages.
              SVG content in code blocks is automatically detected and rendered as interactive images.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm text-gray-600">
              <p><strong>Features Demonstrated:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>Automatic SVG detection in code blocks (language="svg" or content analysis)</li>
                <li>Security sanitization to prevent XSS attacks</li>
                <li>User controls: copy SVG code, download as file, fullscreen view, toggle code view</li>
                <li>Responsive design with proper error handling</li>
                <li>Integration with existing ReactMarkdown pipeline</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Sample Chat Messages</h2>
          
          {mockMessages.map((message) => (
            <Card key={message.id} className="bg-white">
              <CardContent className="p-6">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">AI</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-500 mb-2">
                      Assistant • {message.timestamp.toLocaleTimeString()}
                    </div>
                    <EnhancedMessage
                      message={message}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Implementation Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm text-gray-600">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Security Features:</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>SVG content sanitization removes dangerous elements (script, object, embed, etc.)</li>
                  <li>Event handlers and JavaScript URLs are stripped</li>
                  <li>Only safe SVG elements and attributes are allowed</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">User Experience:</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Click to copy SVG source code to clipboard</li>
                  <li>Download SVG as .svg file</li>
                  <li>Fullscreen viewing for detailed inspection</li>
                  <li>Toggle between image and code view</li>
                  <li>Responsive design adapts to container size</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SVGTestPage;