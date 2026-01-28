import React from 'react';
import { SEO } from '@/components/SEO';
import { AdminPanel } from '@/components/admin/AdminPanel';

const Admin = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <SEO 
        title="Admin Panel - HayyProtocol"
        description="Administrative functions for HayyProtocol protocol"
      />
      
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
          <p className="text-gray-600">
            Manual operations for HayyProtocol protocol. These functions are normally handled by the relayer.
          </p>
        </div>
        
        <AdminPanel />
      </div>
    </div>
  );
};

export default Admin;