import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Clock, Calendar } from 'lucide-react';

interface ServiceScheduleProps {
  value?: { day: number; open: string; close: string }[];
  onChange: (value: { day: number; open: string; close: string }[]) => void;
  error?: string;
  required?: boolean;
}

const ServiceSchedule: React.FC<ServiceScheduleProps> = ({ 
  value = [], 
  onChange, 
  error,
  required = false 
}) => {
  const [workDays, setWorkDays] = useState({ start: 1, end: 5 }); // Lun-Vie por defecto
  const [workHours, setWorkHours] = useState({ open: '09:00', close: '18:00' });
  const [weekendEnabled, setWeekendEnabled] = useState(false);
  const [weekendDays, setWeekendDays] = useState({ saturday: false, sunday: false });
  const [weekendHours, setWeekendHours] = useState({ open: '10:00', close: '16:00' });
  
  // Flags para controlar la hidratación y evitar bucles infinitos
  const hydratingRef = useRef(false);
  const lastEmittedRef = useRef<string>('');
  const isInitializedRef = useRef(false);

  const days = [
    { value: 1, label: 'Lunes' },
    { value: 2, label: 'Martes' },
    { value: 3, label: 'Miércoles' },
    { value: 4, label: 'Jueves' },
    { value: 5, label: 'Viernes' },
    { value: 6, label: 'Sábado' },
    { value: 7, label: 'Domingo' }
  ];

  // Función para generar el array de horarios
  const generateSchedule = useCallback(() => {
    const schedule: { day: number; open: string; close: string }[] = [];
    
    // Agregar días laborales
    for (let day = workDays.start; day <= workDays.end; day++) {
      schedule.push({
        day,
        open: workHours.open,
        close: workHours.close
      });
    }
    
    // Agregar días de fin de semana si está habilitado
    if (weekendEnabled) {
      if (weekendDays.saturday) {
        schedule.push({
          day: 6,
          open: weekendHours.open,
          close: weekendHours.close
        });
      }
      if (weekendDays.sunday) {
        schedule.push({
          day: 7,
          open: weekendHours.open,
          close: weekendHours.close
        });
      }
    }
    
    return schedule;
  }, [workDays, workHours, weekendEnabled, weekendDays, weekendHours]);

  // Función para emitir cambios solo cuando sea necesario
  const emitChange = useCallback((schedule: { day: number; open: string; close: string }[]) => {
    const scheduleString = JSON.stringify(schedule);
    
    // Solo emitir si el valor realmente cambió y no estamos hidratando
    if (scheduleString !== lastEmittedRef.current && !hydratingRef.current) {
      lastEmittedRef.current = scheduleString;
      onChange(schedule);
    }
  }, [onChange]);

  // Hidratar estado desde el valor externo (solo una vez o cuando cambie realmente)
  useEffect(() => {
    if (!isInitializedRef.current && value && value.length > 0) {
      hydratingRef.current = true;
      
      // Encontrar el rango de días laborales
      const workDaysInSchedule = value.filter(item => item.day >= 1 && item.day <= 5);
      if (workDaysInSchedule.length > 0) {
        const startDay = Math.min(...workDaysInSchedule.map(item => item.day));
        const endDay = Math.max(...workDaysInSchedule.map(item => item.day));
        setWorkDays({ start: startDay, end: endDay });
        
        // Usar las horas del primer día laboral
        const firstWorkDay = workDaysInSchedule[0];
        setWorkHours({ open: firstWorkDay.open, close: firstWorkDay.close });
      }
      
      // Verificar si hay días de fin de semana
      const weekendDaysInSchedule = value.filter(item => item.day >= 6);
      if (weekendDaysInSchedule.length > 0) {
        setWeekendEnabled(true);
        setWeekendDays({
          saturday: weekendDaysInSchedule.some(item => item.day === 6),
          sunday: weekendDaysInSchedule.some(item => item.day === 7)
        });
        
        // Usar las horas del primer día de fin de semana
        const firstWeekendDay = weekendDaysInSchedule[0];
        setWeekendHours({ open: firstWeekendDay.open, close: firstWeekendDay.close });
      }
      
      isInitializedRef.current = true;
      hydratingRef.current = false;
    }
  }, [value]);

  // Emitir cambios cuando cambien los horarios internos
  useEffect(() => {
    if (isInitializedRef.current) {
      const schedule = generateSchedule();
      emitChange(schedule);
    } else if (value.length === 0) {
      // Para publicaciones nuevas, emitir datos por defecto
      isInitializedRef.current = true;
      const schedule = generateSchedule();
      emitChange(schedule);
    }
  }, [generateSchedule, emitChange, value.length]);

  const handleWorkDayChange = (field: 'start' | 'end', day: number) => {
    setWorkDays(prev => {
      const newWorkDays = { ...prev, [field]: day };
      // Asegurar que start <= end
      if (field === 'start' && newWorkDays.start > newWorkDays.end) {
        newWorkDays.end = newWorkDays.start;
      } else if (field === 'end' && newWorkDays.end < newWorkDays.start) {
        newWorkDays.start = newWorkDays.end;
      }
      return newWorkDays;
    });
  };

  const handleWeekendDayToggle = (day: 'saturday' | 'sunday') => {
    setWeekendDays(prev => ({
      ...prev,
      [day]: !prev[day]
    }));
  };

  const formatScheduleDisplay = () => {
    const schedule = generateSchedule();
    if (schedule.length === 0) return '';
    
    const dayGroups: { [key: number]: { day: number; open: string; close: string }[] } = {};
    schedule.forEach(item => {
      if (!dayGroups[item.day]) {
        dayGroups[item.day] = [];
      }
      dayGroups[item.day].push(item);
    });

    const dayLabels: { [key: number]: string } = {
      1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb', 7: 'Dom'
    };

    const formatDayGroup = (day: number, items: { day: number; open: string; close: string }[]) => {
      const dayLabel = dayLabels[day];
      const timeRanges = items.map(item => `${item.open}-${item.close}`).join(', ');
      return `${dayLabel} ${timeRanges}`;
    };

    // Ordenar por día de la semana
    return Object.keys(dayGroups)
      .map(Number)
      .sort((a, b) => a - b)
      .map(day => formatDayGroup(day, dayGroups[day]))
      .join(', ');
  };

  return (
    <div className="space-y-4">
      <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Horario de atención
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      
      {/* Vista previa del horario */}
      {generateSchedule().length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Horario configurado
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-gray-700">{formatScheduleDisplay()}</p>
          </CardContent>
        </Card>
      )}

      {/* Bloque laboral obligatorio */}
      <Card className="border border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Días laborales (obligatorio)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Desde</Label>
              <select
                value={workDays.start}
                onChange={(e) => handleWorkDayChange('start', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {days.slice(0, 5).map(day => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Hasta</Label>
              <select
                value={workDays.end}
                onChange={(e) => handleWorkDayChange('end', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {days.slice(0, 5).map(day => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Hora de apertura</Label>
              <Input
                type="time"
                value={workHours.open}
                onChange={(e) => setWorkHours(prev => ({ ...prev, open: e.target.value }))}
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Hora de cierre</Label>
              <Input
                type="time"
                value={workHours.close}
                onChange={(e) => setWorkHours(prev => ({ ...prev, close: e.target.value }))}
                className="text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bloque fin de semana opcional */}
      <Card className="border border-gray-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Fin de semana (opcional)
            </CardTitle>
            <Switch
              checked={weekendEnabled}
              onCheckedChange={setWeekendEnabled}
            />
          </div>
        </CardHeader>
        
        {weekendEnabled && (
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs mb-2 block">Días de fin de semana</Label>
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="saturday"
                    checked={weekendDays.saturday}
                    onCheckedChange={() => handleWeekendDayToggle('saturday')}
                  />
                  <Label htmlFor="saturday" className="text-sm">Sábado</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sunday"
                    checked={weekendDays.sunday}
                    onCheckedChange={() => handleWeekendDayToggle('sunday')}
                  />
                  <Label htmlFor="sunday" className="text-sm">Domingo</Label>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Hora de apertura</Label>
                <Input
                  type="time"
                  value={weekendHours.open}
                  onChange={(e) => setWeekendHours(prev => ({ ...prev, open: e.target.value }))}
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Hora de cierre</Label>
                <Input
                  type="time"
                  value={weekendHours.close}
                  onChange={(e) => setWeekendHours(prev => ({ ...prev, close: e.target.value }))}
                  className="text-sm"
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>
      
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};

export default ServiceSchedule;