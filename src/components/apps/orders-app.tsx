
import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const orders = [
  {
    id: 'BR-2024-0847',
    patient: 'Sarah Johnson',
    doctor: 'Dr. Smith Orthodontics',
    product: 'Brava Independent Movers®',
    status: 'In Production',
    priority: 'High',
    created: '2024-01-15',
    estimated: '2024-01-22',
  },
  {
    id: 'BR-2024-0846',
    patient: 'Michael Chen',
    doctor: 'Bright Smiles Clinic',
    product: 'Brava Independent Movers®',
    status: 'Quality Check',
    priority: 'Normal',
    created: '2024-01-14',
    estimated: '2024-01-21',
  },
  {
    id: 'BR-2024-0845',
    patient: 'Emma Davis',
    doctor: 'Perfect Teeth Center',
    product: 'Brava Independent Movers®',
    status: 'Shipped',
    priority: 'Normal',
    created: '2024-01-13',
    estimated: '2024-01-20',
  },
  {
    id: 'BR-2024-0844',
    patient: 'James Wilson',
    doctor: 'Elite Orthodontics',
    product: 'Brava Independent Movers®',
    status: 'Delivered',
    priority: 'Low',
    created: '2024-01-12',
    estimated: '2024-01-19',
  },
];

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'In Production':
      return <Package className="h-4 w-4" />;
    case 'Quality Check':
      return <AlertCircle className="h-4 w-4" />;
    case 'Shipped':
      return <Clock className="h-4 w-4" />;
    case 'Delivered':
      return <CheckCircle className="h-4 w-4" />;
    default:
      return <Package className="h-4 w-4" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'In Production':
      return 'bg-blue-100 text-blue-800';
    case 'Quality Check':
      return 'bg-yellow-100 text-yellow-800';
    case 'Shipped':
      return 'bg-purple-100 text-purple-800';
    case 'Delivered':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'High':
      return 'bg-red-100 text-red-800';
    case 'Normal':
      return 'bg-blue-100 text-blue-800';
    case 'Low':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const OrdersApp: React.FC = () => {
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
              Order Management
            </h2>
            <p className="text-brius-gray font-body">
              Track and manage orthodontic appliance orders
            </p>
          </div>
          <Button className="bg-brius-primary hover:bg-brius-secondary">
            New Order
          </Button>
        </div>

        <div className="space-y-4">
          {orders.map((order, index) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-display font-medium flex items-center gap-2">
                        {getStatusIcon(order.status)}
                        Order {order.id}
                      </CardTitle>
                      <div className="mt-2 space-y-1">
                        <p className="text-sm font-body">
                          <span className="font-semibold">Patient:</span> {order.patient}
                        </p>
                        <p className="text-sm font-body">
                          <span className="font-semibold">Doctor:</span> {order.doctor}
                        </p>
                        <p className="text-sm font-body">
                          <span className="font-semibold">Product:</span> {order.product}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:items-end gap-2">
                      <div className="flex gap-2">
                        <Badge className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                        <Badge className={getPriorityColor(order.priority)}>
                          {order.priority}
                        </Badge>
                      </div>
                      <div className="text-sm text-brius-gray font-body">
                        Est. Delivery: {new Date(order.estimated).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-brius-gray font-body">
                      Created: {new Date(order.created).toLocaleDateString()}
                    </div>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
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
