// utils/deviceDetector.ts
export function detectDevice(userAgent: string) {
  const ua = userAgent.toLowerCase();

  // Detectar tipo de dispositivo
  let type: 'mobile' | 'desktop' | 'tablet' = 'desktop';
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    type = 'tablet';
  } else if (
    /mobile|android|iphone|ipod|blackberry|opera mini|iemobile|wpdesktop/i.test(
      ua
    )
  ) {
    type = 'mobile';
  }

  // Detectar plataforma
  let platform: 'web' | 'ios' | 'android' = 'web';
  if (/iphone|ipad|ipod/.test(ua)) {
    platform = 'ios';
  } else if (/android/.test(ua)) {
    platform = 'android';
  }

  // Detectar navegador
  let browser = 'unknown';
  if (ua.includes('chrome')) browser = 'chrome';
  else if (ua.includes('safari')) browser = 'safari';
  else if (ua.includes('firefox')) browser = 'firefox';
  else if (ua.includes('edge')) browser = 'edge';
  else if (ua.includes('opera')) browser = 'opera';

  // Detectar SO
  let os = 'unknown';
  if (ua.includes('windows')) os = 'windows';
  else if (ua.includes('mac')) os = 'macos';
  else if (ua.includes('linux')) os = 'linux';
  else if (ua.includes('android')) os = 'android';
  else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad'))
    os = 'ios';

  return {
    type,
    platform,
    userAgent,
    browser,
    os,
  };
}
