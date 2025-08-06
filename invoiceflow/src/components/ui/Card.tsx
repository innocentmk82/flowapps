import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className, hover = false }) => {
  return (
    <motion.div
      whileHover={hover ? { y: -4 } : {}}
      className={cn(
        'bg-white dark:bg-gray-800 rounded-xl shadow-lg backdrop-blur-sm border border-gray-200 dark:border-gray-700 p-6',
        className
      )}
    >
      {children}
    </motion.div>
  );
};