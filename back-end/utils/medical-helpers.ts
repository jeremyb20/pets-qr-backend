// utils/medical-helpers.ts
export const getReasonLabel = (reason: string): string => {
  const reasons: { [key: string]: string } = {
    annual_checkup: 'Chequeo anual',
    vaccination: 'Vacunación',
    deworming: 'Desparasitación',
    weight_control: 'Control de peso',
    digestive_issues: 'Problemas digestivos',
    skin_problems: 'Problemas de piel',
    injury_accident: 'Lesión o accidente',
    surgery: 'Cirugía',
    dental_care: 'Control dental',
    behavior: 'Comportamiento',
    other: 'Otro motivo',
  };
  return reasons[reason] || reason;
};