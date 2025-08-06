import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '../ui/Card';

interface RevenueChartProps {
  data: Array<{ month: string; revenue: number }>;
  userRole?: 'admin' | 'seller';
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ data, userRole = 'admin' }) => {
  return (
    <Card className="col-span-2">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {userRole === 'admin' ? 'Revenue Overview' : 'My Revenue Overview'}
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip 
            formatter={(value) => [`$${value}`, 'Revenue']}
            labelStyle={{ color: 'var(--foreground)' }}
            contentStyle={{ 
              backgroundColor: 'var(--background)',
              border: '1px solid var(--border)'
            }}
          />
          <Area type="monotone" dataKey="revenue" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.1} />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
};