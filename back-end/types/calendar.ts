export type ICalendarDate = string | number;
export type ICalendarEvent = {
  id: string;
  color: string;
  title: string;
  allDay: boolean;
  description: string;
  end: ICalendarDate;
  start: ICalendarDate;
  // Nuevos campos para integrar con mascotas
  petId?: string;
  petName?: string;
  recordId?: string;
  recordType?: 'vaccine' | 'deworming' | 'medical_visit';
  originalData?: any;
};