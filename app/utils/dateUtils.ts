/**
 * Utilitários para formatação e manipulação de datas
 */

/**
 * Formata uma data para exibição em formato brasileiro
 */
export const formatDate = (date: Date | string | any): string => {
  try {
    let dateObj: Date;
    
    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
      dateObj = new Date(date);
    } else if (date?.toDate && typeof date.toDate === 'function') {
      // Firestore Timestamp
      dateObj = date.toDate();
    } else if (date?.seconds) {
      // Firestore Timestamp object
      dateObj = new Date(date.seconds * 1000);
    } else {
      throw new Error('Formato de data inválido');
    }

    // Verificar se a data é válida
    if (isNaN(dateObj.getTime())) {
      return 'Data inválida';
    }

    return dateObj.toLocaleDateString('pt-BR');
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return 'Data inválida';
  }
};

/**
 * Formata uma data e hora para exibição em formato brasileiro
 */
export const formatDateTime = (date: Date | string | any): string => {
  try {
    let dateObj: Date;
    
    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
      dateObj = new Date(date);
    } else if (date?.toDate && typeof date.toDate === 'function') {
      // Firestore Timestamp
      dateObj = date.toDate();
    } else if (date?.seconds) {
      // Firestore Timestamp object
      dateObj = new Date(date.seconds * 1000);
    } else {
      throw new Error('Formato de data inválido');
    }

    // Verificar se a data é válida
    if (isNaN(dateObj.getTime())) {
      return 'Data inválida';
    }

    return dateObj.toLocaleString('pt-BR');
  } catch (error) {
    console.error('Erro ao formatar data e hora:', error);
    return 'Data inválida';
  }
};

/**
 * Verifica se uma data é válida
 */
export const isValidDate = (date: any): boolean => {
  try {
    let dateObj: Date;
    
    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
      dateObj = new Date(date);
    } else if (date?.toDate && typeof date.toDate === 'function') {
      dateObj = date.toDate();
    } else if (date?.seconds) {
      dateObj = new Date(date.seconds * 1000);
    } else {
      return false;
    }

    return !isNaN(dateObj.getTime());
  } catch {
    return false;
  }
};

/**
 * Converte uma string de datetime-local para Date
 */
export const parseDateTime = (dateTimeString: string): Date | null => {
  try {
    if (!dateTimeString) return null;
    
    const date = new Date(dateTimeString);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

/**
 * Formata uma data para o formato datetime-local do HTML
 */
export const formatForDateTimeInput = (date: Date | string | any): string => {
  try {
    let dateObj: Date;
    
    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
      dateObj = new Date(date);
    } else if (date?.toDate && typeof date.toDate === 'function') {
      dateObj = date.toDate();
    } else if (date?.seconds) {
      dateObj = new Date(date.seconds * 1000);
    } else {
      return '';
    }

    if (isNaN(dateObj.getTime())) {
      return '';
    }

    // Formato YYYY-MM-DDTHH:mm para datetime-local
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return '';
  }
};