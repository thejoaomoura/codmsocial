import { SignJWT, importPKCS8 } from "jose";

export async function makeAppleClientSecret() {
  // TODO: GScarabel - Configure as seguintes variáveis no arquivo .env:
  // APPLE_PRIVATE_KEY_P8 - Chave privada .p8 da Apple (formato string com \n para quebras de linha)
  // APPLE_KEY_ID - Key ID (kid) da chave privada
  // APPLE_TEAM_ID - Team ID da sua conta Apple Developer
  // APPLE_CLIENT_ID - Services ID configurado no Apple Developer Console
  
  try {
    const privateKey = await importPKCS8(process.env.APPLE_PRIVATE_KEY_P8!, "ES256");
    
    const jwt = await new SignJWT({})
      .setProtectedHeader({ alg: "ES256", kid: process.env.APPLE_KEY_ID! })
      .setIssuer(process.env.APPLE_TEAM_ID!)                   // Team ID
      .setAudience("https://appleid.apple.com")                // Sempre este valor para Apple
      .setSubject(process.env.APPLE_CLIENT_ID!)                // Services ID
      .setExpirationTime("180d")                               // até ~6 meses
      .sign(privateKey);
    
    return jwt;
  } catch (error) {
    console.error("Erro ao gerar Apple client_secret:", error);
    throw new Error("Falha ao gerar client_secret da Apple. Verifique as configurações no .env");
  }
}