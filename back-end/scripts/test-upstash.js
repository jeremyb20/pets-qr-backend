require('dotenv').config();
const { cacheService } = require('../config/redis');

const testUpstash = async () => {
  console.log('🧪 Testing Upstash Redis connection...');

  try {
    // Test 1: Guardar un valor
    await cacheService.setex('test_key', 60, 'Hello Upstash!');
    console.log('✅ Test 1: SETEX - OK');

    // Test 2: Leer el valor
    const value = await cacheService.get('test_key');
    console.log('✅ Test 2: GET - OK', value);

    // Test 3: Eliminar el valor
    await cacheService.del('test_key');
    console.log('✅ Test 3: DEL - OK');

    console.log('🎉 All Upstash tests passed!');
  } catch (error) {
    console.error('❌ Upstash test failed:', error);
  }
};

testUpstash();
