
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, FileText, Folder, Plus } from 'lucide-react';

const libraryItems = [
  {
    id: '1',
    title: 'Orthodontic Treatment Protocols',
    type: 'folder',
    description: 'Standard procedures and best practices',
    updated: '2024-01-15',
  },
  {
    id: '2',
    title: 'Manufacturing Guidelines',
    type: 'document',
    description: 'Quality control and production standards',
    updated: '2024-01-12',
  },
  {
    id: '3',
    title: 'Patient Communication Templates',
    type: 'folder',
    description: 'Email templates and communication workflows',
    updated: '2024-01-10',
  },
  {
    id: '4',
    title: 'Brava System Documentation',
    type: 'document',
    description: 'Technical specifications and user guides',
    updated: '2024-01-08',
  },
  {
    id: '5',
    title: 'Training Materials',
    type: 'folder',
    description: 'Staff training and certification resources',
    updated: '2024-01-05',
  },
];

export const LibraryApp: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = libraryItems.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-display font-medium text-brius-black">
              Knowledge Library
            </h2>
            <p className="text-brius-gray font-body">
              Access corporate knowledge base and personal documents
            </p>
          </div>
          <Button className="bg-brius-primary hover:bg-brius-secondary">
            <Plus className="h-4 w-4 mr-2" />
            Add Document
          </Button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-3 h-4 w-4 text-brius-gray" />
          <Input
            placeholder="Search knowledge base..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 font-body"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {item.type === 'folder' ? (
                        <Folder className="h-5 w-5 text-brius-secondary" />
                      ) : (
                        <FileText className="h-5 w-5 text-brius-primary" />
                      )}
                      <div>
                        <CardTitle className="text-lg font-display font-medium">
                          {item.title}
                        </CardTitle>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="font-body mb-3">
                    {item.description}
                  </CardDescription>
                  <div className="text-xs text-brius-gray font-body">
                    Updated: {new Date(item.updated).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
