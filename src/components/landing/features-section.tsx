
import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const features = [
  {
    title: 'AI Assistant',
    description: 'Intelligent chat assistant with access to all your systems and data for instant answers and automated workflows.',
    icon: '🤖',
  },
  {
    title: 'Order Tracking',
    description: 'Real-time visibility into manufacturing, shipping, and delivery of orthodontic appliances with predictive analytics.',
    icon: '📦',
  },
  {
    title: 'Patient Management',
    description: 'Comprehensive patient data integration with treatment progress tracking and automated communication.',
    icon: '👥',
  },
  {
    title: 'Doctor Fulfillment',
    description: 'Streamlined custom appliance manufacturing with quality control and delivery optimization.',
    icon: '⚕️',
  },
  {
    title: 'Unified Reporting',
    description: 'Cross-system analytics combining ERP, patient data, communications, and financial information.',
    icon: '📊',
  },
  {
    title: 'Knowledge Library',
    description: 'Centralized knowledge base with RAG-powered search across corporate and personal documentation.',
    icon: '📚',
  },
];

export const FeaturesSection: React.FC = () => {
  return (
    <section id="features" className="py-24 bg-brius-gray-light">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-display font-light text-brius-black mb-6">
            Intelligent Operations Platform
          </h2>
          <p className="text-xl text-brius-gray max-w-3xl mx-auto font-body">
            Powered by advanced AI agents and the Agent2Agent protocol, our platform 
            connects all your systems for seamless operations management.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow bg-white border-brius-gray/20">
                <CardHeader>
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <CardTitle className="text-xl font-display font-medium text-brius-black">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-brius-gray font-body">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
