import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../utils/currency';
import { format, startOfDay, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';

interface SalesChartProps {
  data: any[];
  period: 'daily' | 'weekly' | 'monthly';
}

const SalesChart: React.FC<SalesChartProps> = ({ data, period }) => {
  const processChartData = () => {
    const now = new Date();
    let intervals: Date[] = [];
    let formatString = '';

    switch (period) {
      case 'daily':
        // Show hourly data for today
        intervals = Array.from({ length: 24 }, (_, i) => {
          const date = new Date(now);
          date.setHours(i, 0, 0, 0);
          return date;
        });
        formatString = 'HH:mm';
        break;
      case 'weekly':
        // Show daily data for the week
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 6);
        intervals = eachDayOfInterval({ start: weekStart, end: now });
        formatString = 'MMM dd';
        break;
      case 'monthly':
        // Show daily data for the month
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        intervals = eachDayOfInterval({ start: monthStart, end: now });
        formatString = 'MMM dd';
        break;
    }

    return intervals.map(interval => {
      const intervalSales = data.filter(sale => {
        const saleDate = new Date(sale.createdAt);
        if (period === 'daily') {
          return saleDate.getHours() === interval.getHours() &&
                 saleDate.toDateString() === now.toDateString();
        } else {
          return saleDate.toDateString() === interval.toDateString();
        }
      });

      const total = intervalSales.reduce((sum, sale) => sum + sale.total, 0);

      return {
        name: format(interval, formatString),
        sales: total,
        transactions: intervalSales.length
      };
    });
  };

  const chartData = processChartData();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Sales Trend
      </h2>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="name" 
              className="text-gray-600 dark:text-gray-400"
              fontSize={12}
            />
            <YAxis 
              className="text-gray-600 dark:text-gray-400"
              fontSize={12}
              tickFormatter={(value) => `E${value}`}
            />
            <Tooltip 
              formatter={(value: number) => [formatCurrency(value), 'Sales']}
              labelStyle={{ color: '#374151' }}
              contentStyle={{ 
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}
            />
            <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SalesChart;