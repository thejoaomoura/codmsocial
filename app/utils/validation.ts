import { OrganizationRole } from "../types";

/**
 * Validações client-side para o sistema de cargos e organizações
 */

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Valida se um usuário pode alterar o cargo de outro membro
 */
export function validateRoleChange(
  changerRole: OrganizationRole,
  currentRole: OrganizationRole,
  newRole: OrganizationRole,
  targetUserId?: string,
  changerUserId?: string,
): ValidationResult {
  // Owner pode alterar qualquer cargo (exceto seu próprio)
  if (changerRole === "owner") {
    if (currentRole === "owner") {
      return {
        valid: false,
        reason: "Não é possível alterar o cargo do proprietário",
      };
    }

    return { valid: true };
  }

  // Moderator pode alterar cargos de Manager e Member
  if (changerRole === "moderator") {
    if (currentRole === "owner" || currentRole === "moderator") {
      return {
        valid: false,
        reason:
          "Moderadores não podem alterar cargos de Owner ou outros Moderadores",
      };
    }

    if (newRole === "owner" || newRole === "moderator") {
      return {
        valid: false,
        reason: "Moderadores não podem promover membros a Owner ou Moderador",
      };
    }

    return { valid: true };
  }

  // Manager e Member não podem alterar cargos
  return {
    valid: false,
    reason: "Você não tem permissão para alterar cargos de membros",
  };
}

/**
 * Valida se um usuário pode remover outro membro
 */
export function validateMemberRemoval(
  removerRole: OrganizationRole,
  targetRole: OrganizationRole,
): ValidationResult {
  // Owner pode remover qualquer membro (exceto ele mesmo)
  if (removerRole === "owner") {
    if (targetRole === "owner") {
      return {
        valid: false,
        reason: "O proprietário não pode ser removido",
      };
    }

    return { valid: true };
  }

  // Moderator pode remover Manager e Member
  if (removerRole === "moderator") {
    if (targetRole === "owner" || targetRole === "moderator") {
      return {
        valid: false,
        reason: "Moderadores não podem remover Owner ou outros Moderadores",
      };
    }

    return { valid: true };
  }

  // Manager pode remover apenas Member
  if (removerRole === "manager") {
    if (targetRole === "ranked" || targetRole === "pro") {
      return { valid: true };
    }

    return {
      valid: false,
      reason: "Managers só podem remover membros de nível inferior",
    };
  }

  // Member não pode remover ninguém
  return {
    valid: false,
    reason: "Você não tem permissão para remover membros",
  };
}

/**
 * Valida se um cargo pode convidar novos membros
 */
export function validateInvitePermission(
  role: OrganizationRole,
): ValidationResult {
  if (role === "owner" || role === "moderator" || role === "manager") {
    return { valid: true };
  }

  return {
    valid: false,
    reason: "Apenas Owner, Moderador ou Manager podem convidar novos membros",
  };
}

/**
 * Valida se um cargo pode aprovar convites
 */
export function validateInviteApproval(
  role: OrganizationRole,
): ValidationResult {
  if (role === "owner" || role === "moderator") {
    return { valid: true };
  }

  return {
    valid: false,
    reason: "Apenas Owner ou Moderador podem aprovar convites",
  };
}

/**
 * Valida dados de criação de organização
 */
export function validateOrganizationCreation(data: {
  name: string;
  tag: string;
  description?: string;
}): ValidationResult {
  // Validar nome
  if (!data.name || data.name.trim().length < 3) {
    return {
      valid: false,
      reason: "Nome deve ter pelo menos 3 caracteres",
    };
  }

  if (data.name.length > 50) {
    return {
      valid: false,
      reason: "Nome não pode ter mais de 50 caracteres",
    };
  }

  // Validar tag
  const tagValidation = validateTagFormat(data.tag);

  if (!tagValidation.valid) {
    return tagValidation;
  }

  // Validar descrição (opcional)
  if (data.description && data.description.length > 500) {
    return {
      valid: false,
      reason: "Descrição não pode ter mais de 500 caracteres",
    };
  }

  return { valid: true };
}

/**
 * Valida formato de email para convites
 */
export function validateInviteEmail(email: string): ValidationResult {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || !emailRegex.test(email)) {
    return {
      valid: false,
      reason: "Email inválido",
    };
  }

  return { valid: true };
}

/**
 * Valida se um cargo pode alterar configurações da organização
 */
export function validateOrganizationSettings(
  role: OrganizationRole,
): ValidationResult {
  if (role === "owner" || role === "moderator") {
    return { valid: true };
  }

  return {
    valid: false,
    reason: "Apenas Owner ou Moderador podem alterar configurações",
  };
}

/**
 * Valida limite de membros
 */
export function validateMemberLimit(
  currentMemberCount: number,
  maxMembers: number,
): ValidationResult {
  if (currentMemberCount >= maxMembers) {
    return {
      valid: false,
      reason: `Limite de ${maxMembers} membros atingido`,
    };
  }

  return { valid: true };
}

/**
 * Valida formato da tag da organização
 */
export function validateTagFormat(tag: string): ValidationResult {
  if (!tag || tag.trim().length < 2) {
    return {
      valid: false,
      reason: "Tag deve ter pelo menos 2 caracteres",
    };
  }

  if (tag.length > 10) {
    return {
      valid: false,
      reason: "Tag não pode ter mais de 10 caracteres",
    };
  }

  // Apenas letras, números e underscore
  const tagRegex = /^[a-zA-Z0-9_]+$/;

  if (!tagRegex.test(tag)) {
    return {
      valid: false,
      reason: "Tag pode conter apenas letras, números e underscore",
    };
  }

  return { valid: true };
}

/**
 * Valida hierarquia de cargos para promoção/rebaixamento
 */
export function validateRoleHierarchy(
  fromRole: OrganizationRole,
  toRole: OrganizationRole,
): ValidationResult {
  const hierarchy: Record<OrganizationRole, number> = {
    ranked: 1,
    pro: 2,
    manager: 3,
    moderator: 4,
    owner: 5,
  };

  const fromLevel = hierarchy[fromRole];
  const toLevel = hierarchy[toRole];

  if (fromLevel === toLevel) {
    return {
      valid: false,
      reason: "Membro já possui este cargo",
    };
  }

  return { valid: true };
}

/**
 * Valida se um convite ainda está válido
 */
export function validateInviteExpiration(expiresAt: Date): ValidationResult {
  if (new Date() > expiresAt) {
    return {
      valid: false,
      reason: "Convite expirado",
    };
  }

  return { valid: true };
}
