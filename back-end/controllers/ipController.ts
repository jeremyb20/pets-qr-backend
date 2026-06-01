// back-end/controllers/ipController.ts
import { Request, Response, NextFunction } from 'express';
import 'dotenv/config';
import { cacheService } from '../config/redis';

// Valores por defecto para Costa Rica
const DEFAULT_COUNTRY = {
  name: 'Costa Rica',
  code: 'CR',
  city: 'San José',
  region: 'San José',
};

// Tiempo de caché en segundos (1 hora = 3600 segundos)
const CACHE_TTL = 3600;

export const getIpInfo = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    console.log('📡 IP Info endpoint called');

    // Obtener la IP real del cliente
    const forwardedFor = req.headers['x-forwarded-for'];
    const cfConnectingIp = req.headers['cf-connecting-ip'];
    const remoteIp = req.socket.remoteAddress;

    let clientIp = '';
    if (cfConnectingIp) {
      clientIp = Array.isArray(cfConnectingIp)
        ? cfConnectingIp[0]
        : cfConnectingIp;
    } else if (forwardedFor) {
      clientIp = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    } else if (remoteIp) {
      clientIp = remoteIp;
    }

    const cleanIp = clientIp?.replace(/^::ffff:/, '');
    const cacheKey = `ip_info:${cleanIp || 'default'}`;

    console.log(`🔍 Fetching IP info for: ${cleanIp || 'auto'}`);

    // 1. PRIMERO VERIFICAR CACHÉ (igual que en tu ejemplo de productos)
    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) {
      console.log('✅ Cache hit for IP:', cacheKey);
      // cachedData ya es un objeto, NO usar JSON.parse
      res.status(200).json(cachedData);
      return;
    }

    console.log('⏰ Cache miss for IP:', cacheKey);

    // 2. SI NO HAY CACHÉ, CONSULTAR SERVICIOS EXTERNOS
    let responseData: any = null;

    // Opción 1: Intentar con ipinfo.io
    const ipinfoUrl = cleanIp
      ? `https://ipinfo.io/${cleanIp}/json?token=${process.env.IPINFO_TOKEN}`
      : `https://ipinfo.io/json?token=${process.env.IPINFO_TOKEN}`;

    const ipinfoResponse = await fetch(ipinfoUrl);
    const ipinfoData = (await ipinfoResponse.json()) as any;

    // Verificar si ipinfo.io funcionó correctamente y tiene datos válidos
    if (!ipinfoData.error && ipinfoData.ip) {
      console.log('✅ Success with ipinfo.io', ipinfoData);

      // Validar y asignar valores con fallback a Costa Rica
      const countryCode = ipinfoData.country || DEFAULT_COUNTRY.code;
      const countryName =
        ipinfoData.country_name ||
        getCountryName(countryCode) ||
        DEFAULT_COUNTRY.name;
      const city =
        ipinfoData.city && ipinfoData.city.trim() !== ''
          ? ipinfoData.city
          : DEFAULT_COUNTRY.city;
      const region =
        ipinfoData.region && ipinfoData.region.trim() !== ''
          ? ipinfoData.region
          : DEFAULT_COUNTRY.region;

      responseData = {
        ip: ipinfoData.ip,
        country: countryName,
        country_code: countryCode,
        city: city,
        region: region,
        timestamp: new Date().toISOString(),
      };
    }

    // Opción 2: Fallback a ip-api.com si ipinfo.io falló
    if (!responseData) {
      console.warn('ipinfo.io error or no data:', ipinfoData);

      const fallbackUrl = cleanIp
        ? `http://ip-api.com/json/${cleanIp}`
        : 'http://ip-api.com/json/';

      const fallbackResponse = await fetch(fallbackUrl);
      const fallbackData = (await fallbackResponse.json()) as any;

      if (fallbackData.status === 'success') {
        console.log('✅ Success with ip-api.com (fallback)');

        // Validar y asignar valores con fallback a Costa Rica
        const countryCode = fallbackData.countryCode || DEFAULT_COUNTRY.code;
        const countryName =
          fallbackData.country && fallbackData.country.trim() !== ''
            ? fallbackData.country
            : DEFAULT_COUNTRY.name;
        const city =
          fallbackData.city && fallbackData.city.trim() !== ''
            ? fallbackData.city
            : DEFAULT_COUNTRY.city;
        const region =
          fallbackData.regionName && fallbackData.regionName.trim() !== ''
            ? fallbackData.regionName
            : DEFAULT_COUNTRY.region;

        responseData = {
          ip: fallbackData.query,
          country: countryName,
          country_code: countryCode,
          city: city,
          region: region,
          timestamp: new Date().toISOString(),
        };
      }
    }

    // 3. SI TODOS LOS SERVICIOS FALLARON, USAR DATOS POR DEFECTO
    if (!responseData) {
      console.warn('⚠️ All services failed, using Costa Rica as default');
      responseData = {
        ip: cleanIp || 'unknown',
        country: DEFAULT_COUNTRY.name,
        country_code: DEFAULT_COUNTRY.code,
        city: DEFAULT_COUNTRY.city,
        region: DEFAULT_COUNTRY.region,
        is_fallback: true,
        timestamp: new Date().toISOString(),
      };
    }

    // 4. GUARDAR EN CACHÉ PARA FUTURAS CONSULTAS
    // El cacheService.setex ya serializa a JSON automáticamente
    await cacheService.setex(cacheKey, CACHE_TTL, responseData);
    console.log(`💾 IP info cached for: ${cleanIp || 'default'}`);

    // 5. ENVIAR RESPUESTA AL CLIENTE
    res.status(200).json(responseData);
  } catch (error) {
    console.error('❌ Error fetching IP info:', error);
    next(error);
  }
};

// Función auxiliar para convertir código de país a nombre
function getCountryName(countryCode: string): string | null {
  const countries: Record<string, string> = {
    CR: 'Costa Rica',
    US: 'Estados Unidos',
    MX: 'México',
    GT: 'Guatemala',
    SV: 'El Salvador',
    HN: 'Honduras',
    NI: 'Nicaragua',
    PA: 'Panamá',
    CO: 'Colombia',
    VE: 'Venezuela',
    EC: 'Ecuador',
    PE: 'Perú',
    BO: 'Bolivia',
    CL: 'Chile',
    AR: 'Argentina',
    UY: 'Uruguay',
    PY: 'Paraguay',
    BR: 'Brasil',
    ES: 'España',
  };
  return countries[countryCode] || null;
}
