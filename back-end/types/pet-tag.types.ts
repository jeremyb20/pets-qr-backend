export interface IPosition {
  x: number;
  y: number;
}

export interface IPersonalization {
  name: string;
  phone: string;
  fontSize: number;
  fontColor: string;
  strokeColor: string;
  strokeWidth: number;
  strokePosition: string;
  fontFamily: string;
  moldScale: number;
  moldPosition: IPosition;
  namePosition: IPosition;
  phonePosition: IPosition;
  doubleSided: boolean;
  nameFontSize: number;
  phoneFontSize: number;
}

export interface ITagSide {
  image?: { imageURL?: string; imageID?: string };
  personalization?: IPersonalization;
  background?: string;
}

export interface IPetTagOrder {
  shape: string;
  material: string;
  size: string;
  petType: string;
  contactName: string;
  contactPhone: string;
  contactNote: string;
  front?: ITagSide;
  back?: ITagSide;
  status?: 'pending' | 'in-process' | 'rejected' | 'completed';
}
