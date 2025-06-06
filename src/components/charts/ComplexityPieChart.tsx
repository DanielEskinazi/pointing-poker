import React from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  Title,
} from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, Title);

interface ComplexityPieChartProps {
  data: Record<string, number>;
  title?: string;
}

export const ComplexityPieChart: React.FC<ComplexityPieChartProps> = ({ 
  data, 
  title = 'Story Complexity Distribution' 
}) => {
  const colors = [
    'rgba(34, 197, 94, 0.8)',   // Green - Simple
    'rgba(249, 115, 22, 0.8)',  // Orange - Medium  
    'rgba(239, 68, 68, 0.8)',   // Red - Complex
    'rgba(156, 163, 175, 0.8)',  // Gray - Unknown
  ];

  const borderColors = [
    'rgb(34, 197, 94)',
    'rgb(249, 115, 22)',
    'rgb(239, 68, 68)',
    'rgb(156, 163, 175)',
  ];

  const chartData = {
    labels: Object.keys(data),
    datasets: [
      {
        data: Object.values(data),
        backgroundColor: colors,
        borderColor: borderColors,
        borderWidth: 2,
        hoverBackgroundColor: colors.map(color => color.replace('0.8', '0.9')),
        hoverBorderWidth: 3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: title,
        font: {
          size: 16,
          weight: 'bold' as const,
        },
        padding: {
          bottom: 20,
        },
      },
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.label;
            const value = context.raw;
            const total = Object.values(data).reduce((sum: number, count: number) => sum + count, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
            return `${label}: ${value} stories (${percentage}%)`;
          },
        },
      },
    },
  };

  const totalStories = Object.values(data).reduce((sum, count) => sum + count, 0);

  if (totalStories === 0) {
    return (
      <div className="h-64 w-full flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500">No complexity data available</p>
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <Pie data={chartData} options={options} />
    </div>
  );
};