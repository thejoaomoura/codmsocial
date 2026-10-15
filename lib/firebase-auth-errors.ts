/**
 * Traduz códigos de erro do Firebase Auth (ex.: "auth/invalid-credential")
 * para mensagens claras em português, sem expor detalhes técnicos.
 */

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  // Login com email e senha. As três mensagens são iguais de propósito:
  // não revelam se o email tem conta.
  "auth/invalid-credential": "Email ou senha incorretos.",
  "auth/wrong-password": "Email ou senha incorretos.",
  "auth/user-not-found": "Email ou senha incorretos.",
  "auth/invalid-login-credentials": "Email ou senha incorretos.",
  "auth/missing-password": "Digite sua senha.",
  "auth/missing-email": "Digite seu email.",
  "auth/invalid-email": "O email informado é inválido.",
  "auth/user-disabled": "Esta conta foi desativada. Entre em contato com o suporte.",

  // Cadastro
  "auth/email-already-in-use":
    "Este email já tem uma conta. Entre ou recupere a senha.",
  "auth/weak-password": "Senha fraca. Use pelo menos 6 caracteres.",
  "auth/operation-not-allowed":
    "Este método de login não está disponível no momento.",

  // Link por email e redefinição de senha
  "auth/expired-action-code": "Este link expirou. Peça um novo.",
  "auth/invalid-action-code":
    "Este link é inválido ou já foi usado. Peça um novo.",
  "auth/invalid-continue-uri": "Não foi possível gerar o link. Tente novamente.",
  "auth/unauthorized-continue-uri":
    "Este endereço não está autorizado para enviar links. Tente novamente mais tarde.",

  // Google e outros provedores
  "auth/popup-blocked":
    "O navegador bloqueou a janela de login. Libere pop-ups e tente de novo.",
  "auth/account-exists-with-different-credential":
    "Já existe uma conta com este email usando outro método de login.",
  "auth/credential-already-in-use": "Esta conta já está vinculada a outro usuário.",

  // Rede e limites
  "auth/network-request-failed":
    "Sem conexão com o servidor. Verifique sua internet e tente de novo.",
  "auth/too-many-requests":
    "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
  "auth/requires-recent-login":
    "Por segurança, entre novamente para continuar.",
  "auth/internal-error": "Erro no servidor. Tente novamente em instantes.",
};

const DEFAULT_MESSAGE = "Algo deu errado. Tente novamente.";

const getAuthErrorCode = (error: unknown): string | undefined => {
  if (typeof error === "object" && error !== null && "code" in error) {
    const { code } = error as { code: unknown };

    return typeof code === "string" ? code : undefined;
  }

  return undefined;
};

/** Mensagem amigável para exibir ao usuário. */
export const getAuthErrorMessage = (
  error: unknown,
  fallback: string = DEFAULT_MESSAGE,
): string => {
  const code = getAuthErrorCode(error);

  if (code && AUTH_ERROR_MESSAGES[code]) return AUTH_ERROR_MESSAGES[code];

  // Código desconhecido: registra o original para depuração
  console.error("Erro de autenticação não mapeado:", error);

  return fallback;
};

/** Verdadeiro quando o usuário fechou ou cancelou o pop-up de login. */
export const isAuthCancelledByUser = (error: unknown): boolean => {
  const code = getAuthErrorCode(error);

  return (
    code === "auth/popup-closed-by-user" ||
    code === "auth/cancelled-popup-request"
  );
};
