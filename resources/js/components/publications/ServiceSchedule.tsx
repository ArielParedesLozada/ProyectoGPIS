import React, { useState, useEffect } from 'react';

interface ServiceScheduleProps {
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
}

const ServiceSchedule: React.FC<ServiceScheduleProps> = ({ 
  value = '', 
  onChange, 
  error,
  required = false 
}) => {
  const [schedule, setSchedule] = useState(value);

  useEffect(() => {
    setSchedule(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setSchedule(newValue);
    onChange(newValue);
  };

  const examples = [
    "Lun–Vie 09:00–18:00, Sáb 09:00–13:00",
    "Lunes a Viernes: 8:00 AM - 6:00 PM",
    "24/7",
    "Solo fines de semana: Sáb-Dom 10:00-16:00",
    "Lun, Mié, Vie: 14:00-20:00"
  ];

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Horario de atención
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="space-y-2">
        <textarea
          value={schedule}
          onChange={handleChange}
          placeholder="Ej.: Lun–Vie 09:00–18:00, Sáb 09:00–13:00"
          className={`w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500 ${
            error ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
          }`}
          rows={2}
          maxLength={255}
        />
        
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        
        <div className="text-xs text-gray-500 dark:text-gray-400">
          <p className="mb-1">Ejemplos de formato:</p>
          <div className="space-y-1">
            {examples.map((example, index) => (
              <button
                key={index}
                type="button"
                onClick={() => {
                  setSchedule(example);
                  onChange(example);
                }}
                className="block text-left text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs"
              >
                • {example}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceSchedule;
