
import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, FileBarChart, Download } from 'lucide-react';

const reports = [
  {
    id: '1',
    title: 'Monthly Production Report',
    description: 'Manufacturing output and efficiency metrics',
    type: 'Production',
    lastGenerated: '2024-01-15',
    icon: BarChart3,
  },
  {
    id: '2',
    title: 'Patient Treatment Analytics',
    description: 'Treatment progress and outcome analysis',
    type: 'Clinical',
    lastGenerated: '2024-01-14',
    icon: TrendingUp,
  },
  {
    id: '3',
    title: 'Doctor Performance Dashboard',
    description: 'Practice metrics and satisfaction scores',
    type: 'Performance',
    lastGenerated: '2024-01-13',
    icon: FileBarChart,
  },
  {
    id: '4',
    title: 'Financial Summary',
    description: 'Revenue, costs, and profitability analysis',
    type: 'Financial',
    lastGenerated: '2024-01-12',
    icon: BarChart3,
  },
];

const quickStats = [
  {
    title: 'Orders This Month',
    value: '247',
    change: '+12%',
    positive: true,
  },
  {
    title: 'Average Production Time',
    value: '7.2 days',
    change: '-0.8 days',
    positive: true,
  },
  {
    title: 'Quality Score',
    value: '98.5%',
    change: '+0.3%',
    positive: true,
  },
  {
    title: 'Customer Satisfaction',
    value: '4.8/5',
    change: '+0.1',
    positive: true,
  },
];

export const ReportsApp: React.FC = () => {
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
              Reports & Analytics
            </h2>
            <p className="text-brius-gray font-body">
              Business intelligence and performance insights
            </p>
          </div>
          <Button className="bg-brius-primary hover:bg-brius-secondary">
            Generate Report
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {quickStats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm font-body text-brius-gray mb-1">
                    {stat.title}
                  </div>
                  <div className="text-2xl font-display font-medium text-brius-black mb-1">
                    {stat.value}
                  </div>
                  <div className={`text-xs font-body ${stat.positive ? 'text-green-600' : 'text-red-600'}`}>
                    {stat.change} from last period
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {reports.map((report, index) => (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-brius-gray-light rounded-lg">
                        <report.icon className="h-5 w-5 text-brius-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-display font-medium">
                          {report.title}
                        </CardTitle>
                        <CardDescription className="font-body">
                          {report.description}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm font-body text-brius-gray">
                        Type: {report.type}
                      </div>
                      <div className="text-sm font-body text-brius-gray">
                        Last generated: {new Date(report.lastGenerated).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                      <Button size="sm" className="bg-brius-primary hover:bg-brius-secondary">
                        View
                      </Button>
                    </div>
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
