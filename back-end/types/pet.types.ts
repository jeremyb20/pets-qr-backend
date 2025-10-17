export interface PetProfile {
  petName: string;
  petStatus: string;
  email: string;
  phone: string;
  country: string;
  ownerPetName: string;
  birthDate: string;
  phoneVeterinarian: string;
  veterinarianContact: string;
  photo: string;
  lat: string;
  lng: string;
  isDigitalIdentificationActive: boolean;
  permissions: Permission[];
  petStatusReport: any[];
  _id: string;
  createdAt: string;
  updatedAt: string;
  photo_id: string;
  petViewCounter: any[];
}
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
