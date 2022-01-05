export const BootstrapBreakpoints = [
    { Id: 0, Name: 'xs', MediaQuery: "(max-width: 575.98px)" },
    { Id: 1, Name: 'sm', MediaQuery: "(min-width: 576px) and (max-width: 767.98px)" },
    { Id: 2, Name: 'md', MediaQuery: "(min-width: 768px) and (max-width: 991.98px)" },
    { Id: 3, Name: 'lg', MediaQuery: "(min-width: 992px) and (max-width: 1199.98px)" },
    { Id: 4, Name: 'xl', MediaQuery: "(min-width: 1200px)" },
    { Id: 5, Name: 'landscape', MediaQuery: "(orientation: landscape)" }
];

export const UserState = [
    {Id: 0, IS_ADMIN: true},
    {Id: 1, IS_USER: true},
    {Id: 2, IS_DRIVER: true},
    {Id: 3, IS_COMPANY: true}
]

export type Appointment = {
    id?: string;
    start?: Date;
    end?: Date;
    title?: string;
    allDay?: boolean;
  }

export const TimeoutSeconds: number = 95 * 60;

export class Notification {

    constructor(
      public id: number,
      public type: NotificationType,
      public title: string,
      public message: string,
      public timeout: number,
    ) { }
}
  
export enum NotificationType {
success = 0,
warning = 1,
error = 2,
info = 3
}