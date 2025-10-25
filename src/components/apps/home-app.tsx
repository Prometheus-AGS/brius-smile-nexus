import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, Package, Users, MessageSquare, RefreshCw } from 'lucide-react';

interface DashboardStats {
  title: string;
  value: string;
  change: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const defaultStats: DashboardStats[] = [
  {
    title: 'Active Orders',
    value: '247',
    change: '+12%',
    icon: Package,
    color: 'text-brius-primary',
  },
  {
    title: 'Patients',
    value: '1,834',
    change: '+5%',
    icon: Users,
    color: 'text-brius-secondary',
  },
  {
    title: 'AI Interactions',
    value: '423',
    change: '+28%',
    icon: MessageSquare,
    color: 'text-brius-accent',
  },
  {
    title: 'Reports Generated',
    value: '89',
    change: '+15%',
    icon: BarChart3,
    color: 'text-brius-primary',
  },
];

export const HomeApp: React.FC = () => {
  const [stats] = useState<DashboardStats[]>(defaultStats);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  /**
   * Refresh dashboard data - currently just updates the timestamp
   * TODO: Re-implement with working backend integration
   */
  const refreshDashboard = () => {
    setLastUpdated(new Date());
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-display font-medium text-brius-black">
            Operations Overview
          </h2>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm text-brius-gray">
              System: Online
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshDashboard}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Last Updated Display */}
        {lastUpdated && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="font-display font-medium">Dashboard Status</CardTitle>
              <CardDescription className="font-body">
                Last refreshed: {lastUpdated.toLocaleTimeString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-body text-brius-gray">
                Dashboard data is currently using static values. Dynamic data integration will be available in a future update.
              </div>
            </CardContent>
          </Card>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-body font-medium text-brius-gray">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-display font-medium text-brius-black">
                    {stat.value}
                  </div>
                  <p className="text-xs text-brius-gray font-body">
                    <span className="text-green-600">{stat.change}</span> from last month
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-display font-medium">Recent Activity</CardTitle>
              <CardDescription className="font-body">
                Latest system interactions and updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-l-2 border-brius-primary pl-4">
                  <p className="text-sm font-body font-semibold">New order processed</p>
                  <p className="text-xs text-brius-gray font-body">Order #BR-2024-0847 - 2 minutes ago</p>
                </div>
                <div className="border-l-2 border-brius-secondary pl-4">
                  <p className="text-sm font-body font-semibold">AI assistant query resolved</p>
                  <p className="text-xs text-brius-gray font-body">Patient timeline inquiry - 5 minutes ago</p>
                </div>
                <div className="border-l-2 border-brius-accent pl-4">
                  <p className="text-sm font-body font-semibold">Report generated</p>
                  <p className="text-xs text-brius-gray font-body">Monthly fulfillment analytics - 12 minutes ago</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display font-medium">Quick Actions</CardTitle>
              <CardDescription className="font-body">
                Common tasks and workflows
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <button type="button" className="w-full text-left p-3 rounded-lg border border-brius-gray/20 hover:bg-brius-gray-light transition-colors">
                  <p className="font-body font-semibold text-brius-black">Check Order Status</p>
                  <p className="text-xs text-brius-gray font-body">Track current manufacturing and shipping</p>
                </button>
                <button type="button" className="w-full text-left p-3 rounded-lg border border-brius-gray/20 hover:bg-brius-gray-light transition-colors">
                  <p className="font-body font-semibold text-brius-black">Generate Report</p>
                  <p className="text-xs text-brius-gray font-body">Create custom analytics dashboard</p>
                </button>
                <button type="button" className="w-full text-left p-3 rounded-lg border border-brius-gray/20 hover:bg-brius-gray-light transition-colors">
                  <p className="font-body font-semibold text-brius-black">Ask AI Assistant</p>
                  <p className="text-xs text-brius-gray font-body">Get instant answers to your questions</p>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
};
