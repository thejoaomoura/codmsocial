import { OrganizationRole, RolePermissions } from '../types';

/**
 * Hook para gerenciar permissões e validações de cargos
 */
export const useRoleManagement = () => {
  
  /**
   * Retorna as permissões de um cargo específico
   */
  const getRolePermissions = (role: OrganizationRole): RolePermissions => {
    switch (role) {
      case 'owner':
        return {
          canInviteMembers: true,
          canRemoveMembers: true,
          canChangeRoles: true,
          canManageOrganization: true,
          canCreateEvents: true,
          canRegisterForEvents: true,
          canManageEventRegistrations: true,
          canViewEvents: true,
          canViewOwnRosterStatus: true,
        };
      
      case 'moderator':
        return {
          canInviteMembers: true,
          canRemoveMembers: true,
          canChangeRoles: true, // mas com restrições (não pode alterar owner ou outros moderators)
          canManageOrganization: false,
          canCreateEvents: true,
          canRegisterForEvents: true,
          canManageEventRegistrations: true,
          canViewEvents: true,
          canViewOwnRosterStatus: true,
        };
      
      case 'manager':
        return {
          canInviteMembers: false,
          canRemoveMembers: false,
          canChangeRoles: false,
          canManageOrganization: false,
          canCreateEvents: true,
          canRegisterForEvents: true,
          canManageEventRegistrations: true,
          canViewEvents: true,
          canViewOwnRosterStatus: true,
        };
      
      case 'pro':
      case 'ranked':
        return {
          canInviteMembers: false,
          canRemoveMembers: false,
          canChangeRoles: false,
          canManageOrganization: false,
          canCreateEvents: false,
          canRegisterForEvents: false, // Não podem inscrever a organização
          canManageEventRegistrations: false,
          canViewEvents: true, // Nova permissão: podem visualizar eventos
          canViewOwnRosterStatus: true, // Nova permissão: podem ver seu status no roster
        };
      
      default:
        return {
          canInviteMembers: false,
          canRemoveMembers: false,
          canChangeRoles: false,
          canManageOrganization: false,
          canCreateEvents: false,
          canRegisterForEvents: false,
          canManageEventRegistrations: false,
          canViewEvents: false,
          canViewOwnRosterStatus: false,
        };
    }
  };

  /**
   * Verifica se um cargo pode alterar outro cargo
   */
  const canChangeRole = (
    changerRole: OrganizationRole,
    currentRole: OrganizationRole,
    newRole: OrganizationRole
  ): boolean => {
    // Owner pode alterar qualquer cargo (exceto remover o último owner - validado no servidor)
    if (changerRole === 'owner') {
      return true;
    }

    // Moderator pode alterar cargos, mas com restrições
    if (changerRole === 'moderator') {
      // Não pode alterar owner
      if (currentRole === 'owner' || newRole === 'owner') {
        return false;
      }
      
      // Não pode alterar outros moderators
      if (currentRole === 'moderator' || newRole === 'moderator') {
        return false;
      }
      
      // Pode alterar manager, pro e ranked
      return true;
    }

    // Outros cargos não podem alterar nenhum cargo
    return false;
  };

  /**
   * Verifica se um cargo pode remover outro membro
   */
  const canRemoveMember = (
    removerRole: OrganizationRole,
    targetRole: OrganizationRole
  ): boolean => {
    // Owner pode remover qualquer um (exceto ele mesmo se for o último - validado no servidor)
    if (removerRole === 'owner') {
      return true;
    }

    // Moderator pode remover, mas com restrições
    if (removerRole === 'moderator') {
      // Não pode remover owner ou outros moderators
      if (targetRole === 'owner' || targetRole === 'moderator') {
        return false;
      }
      return true;
    }

    // Outros cargos não podem remover membros
    return false;
  };

  /**
   * Verifica se um cargo pode convidar membros
   */
  const canInviteMembers = (role: OrganizationRole): boolean => {
    return role === 'owner' || role === 'moderator';
  };

  /**
   * Retorna a hierarquia de cargos (do maior para o menor)
   */
  const getRoleHierarchy = (): OrganizationRole[] => {
    return ['owner', 'moderator', 'manager', 'pro', 'ranked'];
  };

  /**
   * Retorna o nível hierárquico de um cargo (menor número = maior poder)
   */
  const getRoleLevel = (role: OrganizationRole): number => {
    const hierarchy = getRoleHierarchy();
    return hierarchy.indexOf(role);
  };

  /**
   * Verifica se um cargo é superior a outro
   */
  const isRoleHigher = (role1: OrganizationRole, role2: OrganizationRole): boolean => {
    return getRoleLevel(role1) < getRoleLevel(role2);
  };

  /**
   * Retorna o nome amigável do cargo em português
   */
  const getRoleName = (role: OrganizationRole): string => {
    const roleNames = {
      owner: 'Dono',
      moderator: 'Moderador',
      manager: 'Manager',
      pro: 'Pro Player',
      ranked: 'Ranked Player'
    };
    return roleNames[role] || role;
  };

  /**
   * Retorna o emoji do cargo
   */
  const getRoleEmoji = (role: OrganizationRole): string => {
    const roleEmojis = {
      owner: '👑',
      moderator: '🛡️',
      manager: '⚙️',
      pro: '💼',
      ranked: '🎯'
    };
    return roleEmojis[role] || '👤';
  };

  /**
   * Retorna a cor do cargo para UI
   */
  const getRoleColor = (role: OrganizationRole): string => {
    const roleColors = {
      owner: 'warning', // dourado
      moderator: 'danger', // vermelho
      manager: 'primary', // azul
      pro: 'secondary', // roxo
      ranked: 'success' // verde
    };
    return roleColors[role] || 'default';
  };

  /**
   * Valida se uma alteração de cargo é permitida
   */
  const validateRoleChange = (
    changerRole: OrganizationRole,
    targetUserId: string,
    currentRole: OrganizationRole,
    newRole: OrganizationRole,
    changerId: string
  ): { valid: boolean; reason?: string } => {
    // Não pode alterar o próprio cargo
    if (targetUserId === changerId) {
      return { valid: false, reason: 'Não é possível alterar o próprio cargo' };
    }

    // Verificar se tem permissão para alterar cargos
    if (!canChangeRole(changerRole, currentRole, newRole)) {
      return { valid: false, reason: 'Você não tem permissão para esta alteração de cargo' };
    }

    // Validações específicas para moderator
    if (changerRole === 'moderator') {
      if (newRole === 'moderator') {
        return { valid: false, reason: 'Apenas o Owner pode nomear Moderators' };
      }
      if (currentRole === 'moderator') {
        return { valid: false, reason: 'Apenas o Owner pode alterar cargos de Moderators' };
      }
    }

    return { valid: true };
  };

  return {
    getRolePermissions,
    canChangeRole,
    canRemoveMember,
    canInviteMembers,
    getRoleHierarchy,
    getRoleLevel,
    isRoleHigher,
    getRoleName,
    getRoleEmoji,
    getRoleColor,
    validateRoleChange,
  };
};