// utils/dateUtils.ts o en el mismo archivo

/**
 * Calcula el próximo cumpleaños de una mascota
 */
export function getNextBirthday(birthDate: Date, currentDate: Date): Date {
  const nextBirthday = new Date(
    currentDate.getFullYear(),
    birthDate.getMonth(),
    birthDate.getDate()
  );

  // Si el cumpleaños de este año ya pasó, calcular para el próximo año
  if (nextBirthday < currentDate) {
    nextBirthday.setFullYear(currentDate.getFullYear() + 1);
  }

  return nextBirthday;
}

/**
 * Calcula los días hasta el próximo cumpleaños
 */
export function getDaysUntilNextBirthday(birthDate: Date, currentDate: Date): number {
  const nextBirthday = getNextBirthday(birthDate, currentDate);

  // Remover la hora para comparar solo fechas
  const currentDateWithoutTime = new Date(currentDate);
  currentDateWithoutTime.setHours(0, 0, 0, 0);

  const nextBirthdayWithoutTime = new Date(nextBirthday);
  nextBirthdayWithoutTime.setHours(0, 0, 0, 0);

  const diffTime = nextBirthdayWithoutTime.getTime() - currentDateWithoutTime.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Calcula la edad actual de la mascota
 */
export function calculateAge(birthDate: Date, currentDate: Date): number {
  let age = currentDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = currentDate.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && currentDate.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}