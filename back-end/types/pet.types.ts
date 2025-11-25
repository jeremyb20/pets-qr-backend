export interface Permission {
  showPhoneInfo: boolean;
  showEmailInfo: boolean;
  showLinkTwitter: boolean;
  showLinkFacebook: boolean;
  showLinkInstagram: boolean;
  showOwnerPetName: boolean;
  showBirthDate: boolean;
  showAddressInfo: boolean;
  showAgeInfo: boolean;
  showVeterinarianContact: boolean;
  showPhoneVeterinarian: boolean;
  showHealthAndRequirements: boolean;
  showFavoriteActivities: boolean;
  showLocationInfo: boolean;
  _id: string;
}

export interface MedicalRecordResponse {
  _id: string;
  type: 'vaccine' | 'deworming' | 'medical_visit';
  date: string;
  name: string;
  nextDate?: string;
  veterinarianName?: string;
  observations?: string;
  createdAt: string;
  updatedAt: string;
}

interface VaccineInput {
  dateOfApplication: string;
  nextVaccineDate: string;
  vaccineName: string;
  observations?: string;
}

interface DewormingInput {
  dateOfApplication: string;
  nextDewormingDate: string;
  dewormerName: string;
  observations?: string;
}

interface MedicalVisitInput {
  visitDate: string;
  reasonForVisit: string;
  veterinarianName: string;
  observations?: string;
}

export type MedicalRecordInput =
  | VaccineInput
  | DewormingInput
  | MedicalVisitInput;

export const isVaccineInput = (data: any): data is VaccineInput => {
  return (
    data.dateOfApplication !== undefined &&
    data.nextVaccineDate !== undefined &&
    data.vaccineName !== undefined
  );
};

export const isDewormingInput = (data: any): data is DewormingInput => {
  return (
    data.dateOfApplication !== undefined &&
    data.nextDewormingDate !== undefined &&
    data.dewormerName !== undefined
  );
};

export const isMedicalVisitInput = (data: any): data is MedicalVisitInput => {
  return (
    data.visitDate !== undefined &&
    data.reasonForVisit !== undefined &&
    data.veterinarianName !== undefined
  );
};
