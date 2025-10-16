'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { auth } from '../firebase';
import { addToast } from '@heroui/toast';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const handleEmailLinkSignIn = async () => {
      // Verifica se a URL atual é um link de autenticação por email
      if (isSignInWithEmailLink(auth, window.location.href)) {
        setIsLoading(true);
        
        // Pega os parâmetros da URL
        const urlParams = new URLSearchParams(window.location.search);
        const mode = urlParams.get('mode');
        const oobCode = urlParams.get('oobCode');
        
        //console.log('Processando email link:', { mode, oobCode });
        
        try {
          // Tenta recuperar o email do localStorage
          let email = window.localStorage.getItem('emailForSignIn');
          
          // Se não encontrar o email no localStorage, solicita ao usuário
          if (!email) {
            email = window.prompt(
              'Por favor, forneça seu email para confirmação (deve ser o mesmo usado para solicitar o link):'
            );
          }
          
          if (!email) {
            addToast({
              title: 'Erro',
              description: 'Email é necessário para completar a autenticação',
              color: 'danger'
            });
            setIsLoading(false);
            return;
          }
          
          // Completa o processo de login
          const result = await signInWithEmailLink(auth, email, window.location.href);
          
          window.localStorage.removeItem('emailForSignIn');
          
          // Limpa os parâmetros da URL
          window.history.replaceState({}, document.title, '/login');
          
          addToast({
            title: 'Sucesso',
            description: `Login realizado com sucesso! Bem-vindo, ${result.user.email}`,
            color: 'success'
          });
          
          // Redireciona para a página principal
          router.push('/');
          
        } catch (error: any) {
          console.error('Erro no login por email link:', error);
          addToast({
            title: 'Erro no login',
            description: error.message,
            color: 'danger'
          });
          setIsLoading(false);
        }
      } else {
        router.push('/');
      }
    };

    handleEmailLinkSignIn();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Processando autenticação...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600">Redirecionando...</p>
      </div>
    </div>
  );
}