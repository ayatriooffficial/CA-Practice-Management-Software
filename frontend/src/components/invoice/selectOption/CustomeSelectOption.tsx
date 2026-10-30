'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ServiceItem } from '../types';

type FrequencyType = 'MONTHLY' | 'YEARLY' | 'ONE_TIME';



interface ServiceSelectProps {
  items: ServiceItem[];
  placeholder?: string;
  onSelect?: (item: ServiceItem) => void;
  selectedServiceId:string;
}

export default function ServiceSelect({ items, placeholder = 'Select a service', onSelect, selectedServiceId='' }: ServiceSelectProps) {
  const [selectedId, setSelectedId] = useState<string>(selectedServiceId);
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (item: ServiceItem) => {
    setSelectedId(item.id);
    setIsOpen(false);
    if (onSelect) {
      onSelect(item);
    }
  };

  const selectedItem = items.find((item) => item.id === selectedId);

  return (
    <div className="relative w-full max-w-xl font-sans py-2">
      {/* Select Box Header */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm cursor-pointer hover:border-gray-400 transition-colors"
      >
        <label htmlFor=""> Amount For Service<span className='text-orange-700'>*</span> </label> 
        <div className="w-full truncate">
          {selectedItem ? (
            <div className="flex justify-between items-center w-full pr-2">
              <span className="text-gray-900 font-medium truncate">{selectedItem.serviceName}</span>
              <span className="text-gray-600 font-semibold ml-4">{selectedItem.amount.toFixed(2)}</span>
            </div>
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </div>
        <ChevronDown 
          className={`w-5 h-5 text-gray-500 transition-transform duration-200 shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </div>

      {/* Dropdown Options List */}
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => handleSelect(item)}
              className={`flex items-center justify-between px-4 py-3 text-sm cursor-pointer transition-colors ${
                selectedId === item.id
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="truncate pr-4">{item.serviceName}</span>
              <span className="font-semibold text-gray-900 shrink-0">
                ${item.amount.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}