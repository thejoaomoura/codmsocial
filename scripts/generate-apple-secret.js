// Script para gerar o APPLE_CLIENT_SECRET JWT

const { SignJWT, importPKCS8 } = require('jose');
require('dotenv').config();

async function generateAppleClientSecret() {
  try {
    console.log('🍎 Gerando Apple Client Secret JWT...\n');

    // Verificar se todas as variáveis estão configuradas
    const requiredVars = ['APPLE_PRIVATE_KEY_P8', 'APPLE_KEY_ID', 'APPLE_TEAM_ID', 'APPLE_CLIENT_ID'];
    const missing = requiredVars.filter(varName => !process.env[varName] || process.env[varName].includes('XXXXXXXXXX'));
    
    if (missing.length > 0) {
      console.error('❌ Variáveis não configuradas no .env:');
      missing.forEach(varName => console.error(`   - ${varName}`));
      console.error('\n> Configure essas variáveis no arquivo .env antes de executar este script.');
      process.exit(1);
    }

    // Importar a chave privada
    const privateKey = await importPKCS8(process.env.APPLE_PRIVATE_KEY_P8, "ES256");
    
    // Gerar o JWT
    const jwt = await new SignJWT({})
      .setProtectedHeader({ alg: "ES256", kid: process.env.APPLE_KEY_ID })
      .setIssuer(process.env.APPLE_TEAM_ID)                   // Team ID
      .setAudience("https://appleid.apple.com")               // Sempre este valor para Apple
      .setSubject(process.env.APPLE_CLIENT_ID)                // Services ID
      .setExpirationTime("180d")                              // até ~6 meses
      .sign(privateKey);
    
    console.log('✅ JWT gerado com sucesso!\n');
    console.log('📋 Copie o valor abaixo e cole na variável APPLE_CLIENT_SECRET no seu .env:\n');
    console.log('APPLE_CLIENT_SECRET=' + jwt);
    console.log('\n⏰ Este JWT expira em 180 dias. Regenere quando necessário.');
    console.log('🔄 Para regenerar, execute: node scripts/generate-apple-secret.js');
    
  } catch (error) {
    console.error('❌ Erro ao gerar Apple client_secret:', error.message);
    console.error('\n🔍 Verifique se:');
    console.error('   - A chave privada .p8 está correta');
    console.error('   - O Key ID (APPLE_KEY_ID) está correto');
    console.error('   - O Team ID (APPLE_TEAM_ID) está correto');
    console.error('   - O Client ID (APPLE_CLIENT_ID) está correto');
    process.exit(1);
  }
}

generateAppleClientSecret();