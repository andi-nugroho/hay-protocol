import { useContext } from 'react';
import { StacksContext } from '../contexts/StacksContext';

export const useStacks = () => {
  const context = useContext(StacksContext);
  if (!context) {
    throw new Error('useStacks must be used within a StacksProvider');
  }
  return context;
};
