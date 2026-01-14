export function validatePasswordStrength(password: string): {
  valid: boolean;
  message?: string;
  requirements?: string[];
} {
  const requirements: string[] = [];

  // Longitud mínima
  if (password.length < 6) {
    requirements.push('Mínimo 6 caracteres');
  }

  // Letra mayúscula
  if (!/[A-Z]/.test(password)) {
    requirements.push('Al menos una letra mayúscula');
  }

  // Letra minúscula
  if (!/[a-z]/.test(password)) {
    requirements.push('Al menos una letra minúscula');
  }

  // Número
  if (!/\d/.test(password)) {
    requirements.push('Al menos un número');
  }

  // Carácter especial (opcional)
  // if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
  //   requirements.push('Al menos un carácter especial');
  // }

  // No secuencias simples
  const simpleSequences = ['123456', 'password', 'qwerty', 'abcdef'];
  if (simpleSequences.some((seq) => password.toLowerCase().includes(seq))) {
    requirements.push('No usar secuencias comunes');
  }

  // No solo números
  if (/^\d+$/.test(password)) {
    requirements.push('No puede contener solo números');
  }

  if (requirements.length > 0) {
    return {
      valid: false,
      message: 'La contraseña no cumple con los requisitos de seguridad',
      requirements,
    };
  }

  return { valid: true };
}
