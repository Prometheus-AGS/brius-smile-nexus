
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BarChart3, Package, Users, MessageSquare, RefreshCw } from 'lucide-react';
import { useMastraBIAgent } from '@/hooks/use-mastra-bi-agent';

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
  const { executeQuery, isLoading, error, clearError, checkHealth, isHealthy } = useMastraBIAgent();
  const [stats, setStats] = useState<DashboardStats[]>(defaultStats);
  const [agentResponse, setAgentResponse] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  /**
   * Initialize home dashboard with agent data
   */
  const initializeDashboard = async () => {
    try {
      clearError();
      
      // First check agent health
      await checkHealth();
      
      if (!isHealthy) {
        console.warn('Agent is not healthy, using default data');
        return;
      }

      // Request dashboard data from the agent
      const dashboardQuery = {
        id: `home-dashboard-${Date.now()}`,
        type: 'dashboard_query' as const,
        query: 'Provide current business intelligence summary for the home dashboard including active orders, patient counts, AI interactions, and recent reports. Include specific numbers and trends.',
        parameters: {
          dashboard_type: 'home_overview',
          include_metrics: ['orders', 'patients', 'ai_interactions', 'reports'],
          time_range: '30_days',
        },
        timeRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          end: new Date(),
        },
        metrics: ['active_orders', 'patient_count', 'ai_interactions', 'reports_generated'],
        dimensions: ['status', 'department', 'type'],
      };

      const result = await executeQuery(dashboardQuery);
      
      if (result && result.data) {
        setAgentResponse(typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2));
        setLastUpdated(new Date());
        
        // Try to extract metrics from the response if available
        if (result.insights?.trends) {
          console.log('Agent provided insights:', result.insights);
        }
      }
    } catch (error) {
      console.error('Failed to initialize dashboard with agent data:', error);
      // Keep using default stats on error
    }
  };

  /**
   * Refresh dashboard data
   */
  const refreshDashboard = () => {
    initializeDashboard();
  };

  // Initialize dashboard on component mount
  useEffect(() => {
    initializeDashboard();
  }, []);

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
            <div className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-brius-gray">
              Agent: {isHealthy ? 'Connected' : 'Disconnected'}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshDashboard}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert className="mb-6">
            <AlertDescription>
              <strong>Agent Error:</strong> {error.message}
              <Button
                variant="outline"
                size="sm"
                onClick={clearError}
                className="ml-2"
              >
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Agent Response Display */}
        {agentResponse && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="font-display font-medium">AI Business Intelligence Summary</CardTitle>
              <CardDescription className="font-body">
                {lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : 'Real-time insights from your business intelligence agent'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-body whitespace-pre-wrap">
                {agentResponse}
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
                <button className="w-full text-left p-3 rounded-lg border border-brius-gray/20 hover:bg-brius-gray-light transition-colors">
                  <p className="font-body font-semibold text-brius-black">Check Order Status</p>
                  <p className="text-xs text-brius-gray font-body">Track current manufacturing and shipping</p>
                </button>
                <button className="w-full text-left p-3 rounded-lg border border-brius-gray/20 hover:bg-brius-gray-light transition-colors">
                  <p className="font-body font-semibold text-brius-black">Generate Report</p>
                  <p className="text-xs text-brius-gray font-body">Create custom analytics dashboard</p>
                </button>
                <button className="w-full text-left p-3 rounded-lg border border-brius-gray/20 hover:bg-brius-gray-light transition-colors">
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
