# 📧 Configuração do Sistema de E-mails

Este documento explica como configurar o sistema de envio de e-mails para convites de organizações no CODM Social.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Configuração do Resend](#configuração-do-resend)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Testando o Sistema](#testando-o-sistema)
- [Troubleshooting](#troubleshooting)

## 🎯 Visão Geral

O CODM Social usa o **Resend** para enviar e-mails de convite quando um membro convida outro usuário para uma organização.

### Como Funciona

1. Um membro com permissões adequadas envia um convite por e-mail
2. O sistema salva o convite no Firestore
3. Uma API Route (`/api/send-invite`) envia o e-mail via Resend
4. O destinatário recebe um e-mail bonito com um link para se cadastrar/fazer login
5. Ao fazer login com o mesmo e-mail, o convite é automaticamente aceito

## 🚀 Configuração do Resend

### Passo 1: Criar Conta

1. Acesse [resend.com](https://resend.com/)
2. Clique em **"Sign Up"**
3. Crie sua conta (pode usar GitHub, Google ou e-mail)

**Plano Gratuito:**
- ✅ 3.000 e-mails/mês
- ✅ 100 e-mails/dia
- ✅ Todos os recursos
- ✅ Sem cartão de crédito necessário

### Passo 2: Obter API Key

1. Faça login no [Resend Dashboard](https://resend.com/overview)
2. Vá em **"API Keys"** no menu lateral
3. Clique em **"Create API Key"**
4. Dê um nome (ex: "CODM Social Production")
5. Selecione as permissões:
   - ✅ **Sending access** (necessário)
   - ❌ Domains (não necessário agora)
6. Clique em **"Create"**
7. **IMPORTANTE:** Copie a chave imediatamente (ela só aparece uma vez)

Exemplo de chave:
```
re_abc123def456ghi789jkl012mno345pqr678
```

### Passo 3: Configurar Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto e adicione:

```bash
# Resend API Key
RESEND_API_KEY=re_SUA_CHAVE_AQUI

# E-mail remetente (use o domínio de teste para desenvolvimento)
RESEND_FROM_EMAIL=CODM Social <onboarding@resend.dev>

# URL da aplicação
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Passo 4: Instalar Dependências

```bash
npm install resend @react-email/render @react-email/components
```

## 🌐 Configuração para Produção

### Usando Domínio Personalizado

Para enviar e-mails de um domínio próprio (recomendado para produção):

1. Acesse [Resend Domains](https://resend.com/domains)
2. Clique em **"Add Domain"**
3. Digite seu domínio (ex: `codmsocial.com`)
4. Adicione os registros DNS fornecidos no seu provedor de DNS:

```
Tipo    Nome               Valor
TXT     @                  resend-verify-xxxxxxxx
MX      @                  feedback-smtp.us-east-1.amazonses.com (prioridade 10)
TXT     resend._domainkey  p=MIGfMA0GCSq...
```

5. Aguarde a verificação (geralmente 5-10 minutos)
6. Atualize o `.env.local`:

```bash
RESEND_FROM_EMAIL=CODM Social <noreply@codmsocial.com>
```

## 🧪 Testando o Sistema

### 1. Testar Localmente

1. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

2. Faça login na aplicação
3. Acesse uma organização onde você tem permissão para convidar membros
4. Vá na aba **"Convites"**
5. Clique em **"Convidar Membro"**
6. Digite um e-mail de teste (pode ser o seu próprio)
7. Adicione uma mensagem personalizada (opcional)
8. Clique em **"Enviar Convite"**

### 2. Verificar o E-mail

Verifique a caixa de entrada do e-mail informado. Você deve receber um e-mail como este:

```
De: CODM Social <onboarding@resend.dev>
Assunto: 🎉 Você foi convidado para [Nome da Organização]!

[E-mail HTML bonito com logo da organização e botão de aceitar]
```

### 3. Verificar Logs

Se o e-mail não chegar, verifique:

1. **Console do navegador** (F12): Procure por erros na requisição `/api/send-invite`
2. **Terminal do Next.js**: Veja os logs do servidor
3. **Resend Logs**: Acesse [Resend Logs](https://resend.com/emails) para ver todos os e-mails enviados


**Debug:**
```bash
# Ver logs detalhados no terminal
npm run dev

# Verificar requisição no navegador
# Abra DevTools (F12) > Network > Filtro: send-invite
```


## 📚 Recursos Adicionais

- [Documentação Resend](https://resend.com/docs)
- [Resend React Email](https://react.email/) - Templates React para e-mails
- [Resend Examples](https://resend.com/examples) - Exemplos de código
- [Resend Status](https://resend.instatus.com/) - Status do serviço

## 💡 Dicas

1. **Desenvolvimento**: Use `onboarding@resend.dev` para não precisar configurar domínio
2. **Produção**: Configure um domínio próprio para melhor taxa de entrega
3. **Testes**: Crie uma organização de testes para enviar convites
4. **Monitoramento**: Ative notificações no Resend para alertas de problemas
5. **Backup**: Tenha uma API key de backup configurada

