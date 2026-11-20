// utils/dateUtils.ts o en el mismo archivo

export function parseBirthDate(value: Date | string): Date {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  const parsed = new Date(value);
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

/**
 * Calcula el próximo cumpleaños de una mascota
 */
export function getNextBirthday(
  birthDate: Date | string,
  currentDate: Date
): Date {
  const birth = parseBirthDate(birthDate);
  const today = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    currentDate.getDate()
  );

  const nextBirthday = new Date(
    today.getFullYear(),
    birth.getMonth(),
    birth.getDate()
  );

  // Si el cumpleaños de este año ya pasó, calcular para el próximo año
  if (nextBirthday < today) {
    nextBirthday.setFullYear(today.getFullYear() + 1);
  }

  return nextBirthday;
}

/**
 * Calcula los días hasta el próximo cumpleaños
 */
export function getDaysUntilNextBirthday(
  birthDate: Date | string,
  currentDate: Date
): number {
  const nextBirthday = getNextBirthday(birthDate, currentDate);

  // Remover la hora para comparar solo fechas
  const currentDateWithoutTime = new Date(currentDate);
  currentDateWithoutTime.setHours(0, 0, 0, 0);

  const nextBirthdayWithoutTime = new Date(nextBirthday);
  nextBirthdayWithoutTime.setHours(0, 0, 0, 0);

  const diffTime =
    nextBirthdayWithoutTime.getTime() - currentDateWithoutTime.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Calcula la edad actual de la mascota
 */
export function calculateAge(
  birthDate: Date | string,
  currentDate: Date
): number {
  const birth = parseBirthDate(birthDate);
  let age = currentDate.getFullYear() - birth.getFullYear();
  const monthDiff = currentDate.getMonth() - birth.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && currentDate.getDate() < birth.getDate())
  ) {
    age--;
  }

  return age;
}
