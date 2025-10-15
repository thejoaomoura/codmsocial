# Configuração do Sign in with Apple

## Visão Geral
Este documento contém os passos para configurar o Sign in with Apple usando Auth.js (NextAuth v5) com geração dinâmica do client_secret (JWT).

## Configuração no Apple Developer Portal

### 1. Criar App ID
1. Acesse [Apple Developer Portal](https://developer.apple.com)
2. Vá para **Certificates, Identifiers & Profiles**
3. Clique em **Identifiers** → **App IDs**
4. Crie um novo App ID com:
   - Description: `CODMSOCIALAPP`
   - Bundle ID: `com.seudominio.app`
   - Capabilities: Marque **Sign In with Apple**

### 2. Criar Services ID
1. Em **Identifiers**, clique em **Services IDs**
2. Crie um novo Services ID:
   - Description: Nome do serviço web
   - Identifier: `com.seudominio.serviceid` (será o APPLE_CLIENT_ID)
3. Configure **Sign In with Apple**:
   - Primary App ID: Selecione o App ID criado anteriormente
   - Web Domain: `seudominio.com`
   - Return URLs: `https://seudominio.com/api/auth/callback/apple`
   - Para desenvolvimento local: `http://localhost:3000/api/auth/callback/apple`

### 3. Criar Chave Privada
1. Vá para **Keys**
2. Crie uma nova chave:
   - Key Name: `CODM-Apple-SignIn`
   - Services: Marque **Sign In with Apple**
   - Configure: Selecione o Primary App ID
3. **Baixe o arquivo .p8** (só pode ser baixado uma vez!)
4. Anote o **Key ID** (será o APPLE_KEY_ID)

### 4. Obter Team ID
1. No canto superior direito do Apple Developer Portal
2. Clique no nome da sua conta
3. Copie o **Team ID** (será o APPLE_TEAM_ID)

## Configuração do Projeto

### 1. Variáveis de Ambiente
Renomeie o arquivo `.env.example` para `.env` e configure:

```bash
# Services ID
APPLE_CLIENT_ID=com.seudominio.serviceid

# Team ID
APPLE_TEAM_ID=XXXXXXXXXX

# Key ID da chave .p8
APPLE_KEY_ID=XXXXXXXXXX

# Chave privada .p8 em formato string
APPLE_PRIVATE_KEY_P8="-----BEGIN PRIVATE KEY-----\nSUA_CHAVE_PRIVADA_AQUI\n-----END PRIVATE KEY-----"

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=sua_chave_secreta_aleatoria
```

### 2. Converter Chave .p8 para String
A chave privada .p8 deve ser convertida para string com `\n` para quebras de linha:

```bash
# No terminal (Linux/Mac):
cat AuthKey_XXXXXXXXXX.p8 | sed 's/$/\\n/' | tr -d '\n'

# No Windows (PowerShell):
(Get-Content AuthKey_XXXXXXXXXX.p8) -join '\n'
```

### 3. Implementação Atual
- ✅ Auth.js configurado com Apple provider
- ✅ Geração dinâmica do client_secret JWT
- ✅ Botão Sign in with Apple no frontend
- ✅ Rotas API configuradas

### 4. Próximos Passos (GScarabel)
1. Configure as variáveis no arquivo `.env`
2. Teste o login em desenvolvimento
3. Configure domínio e SSL para produção
4. Atualize as Return URLs no Apple Developer Portal

## Detalhes Técnicos

### Client Secret JWT
O client_secret é gerado dinamicamente usando a biblioteca `jose`:
- Algoritmo: ES256
- Audience: `https://appleid.apple.com`
- Issuer: Team ID
- Subject: Services ID (Client ID)
- Expiração: 180 dias (~6 meses)

### Callback URL
- Desenvolvimento: `http://localhost:3000/api/auth/callback/apple`
- Produção: `https://seudominio.com/api/auth/callback/apple`

### Dados do Usuário
A Apple envia nome e email apenas na primeira autorização. Nas próximas, apenas o ID único. O sistema salva essas informações no primeiro login.

## Troubleshooting

### Erro: "Invalid client_secret"
- Verifique se a chave .p8 está correta
- Confirme o Key ID e Team ID
- Certifique-se que a chave não expirou

### Erro: "Invalid redirect_uri"
- Verifique se a URL está configurada no Services ID
- Confirme se está usando HTTPS em produção

### Erro: "Invalid client_id"
- Verifique se o Services ID está correto
- Confirme se o Sign in with Apple está habilitado

## Links Úteis
- [Apple Developer Portal](https://developer.apple.com)
- [Auth.js Apple Provider](https://authjs.dev/reference/core/providers_apple)
- [Sign in with Apple Documentation](https://developer.apple.com/sign-in-with-apple/)