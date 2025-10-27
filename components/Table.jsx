'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { toast } from 'sonner';

export default function Table({ title, columns, data, actionButton, onRowClick }) {
  const [selectedRow, setSelectedRow] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleActionClick = (row) => {
    setSelectedRow(row);
    setIsModalOpen(true);
  };

  return (
    <div className="glassmorphism rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-white mb-6">{title}</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              {columns.map((column) => (
                <th key={column.key} className="text-left py-3 px-4 text-gray-300 font-medium">
                  {column.label}
                </th>
              ))}
              {actionButton && (
                <th className="text-right py-3 px-4 text-gray-300 font-medium">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr 
                key={index} 
                className="border-b border-gray-800 hover:bg-white/5 transition-colors cursor-pointer"
                onClick={() => onRowClick ? onRowClick(row) : null}
              >
                {columns.map((column) => (
                  <td key={column.key} className="py-4 px-4 text-white">
                    {row[column.key]}
                  </td>
                ))}
                {actionButton && (
                  <td className="py-4 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleActionClick(row);
                      }}
                      className="bg-accent hover:bg-accent/90 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors"
                    >
                      {actionButton.label}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {actionButton && (
        <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
            <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 glassmorphism rounded-2xl p-6 max-w-md w-full mx-4">
              <Dialog.Title className="text-lg font-semibold text-white mb-4">
                Coverage Policy Details
              </Dialog.Title>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-400">Pool:</span>
                  <span className="text-white">{selectedRow?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Coverage Size:</span>
                  <span className="text-white">{selectedRow?.size}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Premium Rate:</span>
                  <span className="text-white">{selectedRow?.rate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Coverage Amount:</span>
                  <span className="text-white">$10,000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Premium Cost:</span>
                  <span className="text-white">$210</span>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    toast.success('Coverage purchased successfully!', {
                      description: `Policy activated for ${selectedRow?.name}`,
                    });
                  }}
                  className="flex-1 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg transition-colors"
                >
                  Confirm Purchase
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </div>
  );
}
