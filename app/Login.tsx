"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Tabs, Tab } from "@heroui/tabs";
import { SiGoogle } from "react-icons/si";
import { addToast } from "@heroui/toast";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from "firebase/auth";
import {
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "./firebase";

interface LoginProps {
  handleGoogleLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ handleGoogleLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [mounted, setMounted] = useState(false);

  // Aguardar montagem do componente para evitar erro de SSR
  useEffect(() => {
    setMounted(true);
  }, []);

  const actionCodeSettings = {
    url: mounted
      ? window.location.origin + "/login"
      : "http://localhost:3000/login",
    handleCodeInApp: true,
  };

  const handleEmailPasswordLogin = async () => {
    if (!email || !password) {
      addToast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha email e senha",
        color: "warning",
      });

      return;
    }

    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      addToast({
        title: "Login realizado",
        description: "Bem-vindo de volta!",
        color: "success",
      });
    } catch (error: any) {
      addToast({
        title: "Erro no login",
        description: error.message || "Erro ao fazer login",
        color: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailPasswordRegister = async () => {
    if (!email || !password) {
      addToast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha email e senha",
        color: "warning",
      });

      return;
    }

    if (password.length < 6) {
      addToast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres",
        color: "warning",
      });

      return;
    }

    setIsLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;

      // Criar documento na coleção Users
      const userRef = doc(db, "Users", user.uid);
      await setDoc(userRef, {
        displayName: user.displayName || user.email?.split("@")[0] || "Usuário",
        email: user.email,
        photoURL: user.photoURL || "",
        createdAt: serverTimestamp(),
      });

      addToast({
        title: "Conta criada",
        description: "Sua conta foi criada com sucesso!",
        color: "success",
      });
    } catch (error: any) {
      addToast({
        title: "Erro no cadastro",
        description: error.message || "Erro ao criar conta",
        color: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLinkLogin = async () => {
    if (!email) {
      addToast({
        title: "Email obrigatório",
        description: "Por favor, digite seu email",
        color: "warning",
      });

      return;
    }

    setIsLoading(true);
    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem("emailForSignIn", email);
      addToast({
        title: "Link enviado",
        description: "Verifique seu email e clique no link para fazer login",
        color: "success",
      });
    } catch (error: any) {
      addToast({
        title: "Erro ao enviar link",
        description: error.message || "Erro ao enviar link de login",
        color: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Verificar se o usuário está retornando via email link
  useEffect(() => {
    if (!mounted) return;

    // Verificar se a URL atual contém os parâmetros do email link
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get("mode");
    const oobCode = urlParams.get("oobCode");

    if (
      mode === "signIn" &&
      oobCode &&
      isSignInWithEmailLink(auth, window.location.href)
    ) {
      setIsLoading(true);

      // Tentar recuperar o email do localStorage
      let email = window.localStorage.getItem("emailForSignIn");

      // Se não encontrar o email no localStorage
      if (!email) {
        email = window.prompt(
          "Por favor, forneça seu email para confirmação e conclusão do login:",
        );
      }

      if (email) {
        signInWithEmailLink(auth, email, window.location.href)
          .then(() => {
            // Limpar o email do localStorage após login bem-sucedido
            window.localStorage.removeItem("emailForSignIn");

            // Limpar os parâmetros da URL
            const newUrl = window.location.origin + window.location.pathname;

            window.history.replaceState({}, document.title, newUrl);

            addToast({
              title: "Login realizado com sucesso!",
              description: "Você foi autenticado via link de email.",
              color: "success",
            });
          })
          .catch((error) => {
            console.error("Erro no login via email link:", error);
            addToast({
              title: "Erro na autenticação",
              description:
                error.message ||
                "Erro ao confirmar login via email. Tente novamente.",
              color: "danger",
            });
          })
          .finally(() => {
            setIsLoading(false);
          });
      } else {
        setIsLoading(false);
        addToast({
          title: "Email necessário",
          description:
            "É necessário fornecer o email para completar a autenticação.",
          color: "warning",
        });
      }
    }
  }, [mounted]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Efeito de fundo com partículas */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      <Card className="w-full max-w-md bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 shadow-2xl relative z-10">
        <CardHeader className="flex flex-col items-center gap-4 pb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mb-2">
            <span className="text-2xl font-bold text-white">G</span>
          </div>
          <div className="text-center">
            <h4 className="font-bold text-2xl text-white mb-2">
              Gaming Social Network
            </h4>
            <p className="text-sm text-gray-400">
              Entre com sua conta para continuar
            </p>
          </div>
        </CardHeader>

        <CardBody className="flex flex-col gap-6 pt-0">
          <Button
            className="w-full bg-white text-gray-900 hover:bg-gray-100 font-semibold transition-all duration-200 transform hover:scale-105"
            size="lg"
            startContent={<SiGoogle className="w-5 h-5" />}
            onPress={handleGoogleLogin}
          >
            Entrar com Google
          </Button>

          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent" />
            <span className="text-sm text-gray-400 font-medium">ou</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent" />
          </div>

          <Tabs
            className="w-full flex flex-col items-center"
            classNames={{
              tabList:
                "bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 flex justify-center",
              tab: "text-gray-400 data-[selected=true]:text-white",
              tabContent: "text-gray-400 data-[selected=true]:text-white",
              cursor: "bg-gradient-to-r from-purple-500 to-blue-500",
              panel: "pt-6 w-full",
            }}
            selectedKey={activeTab}
            onSelectionChange={(key) => setActiveTab(key as string)}
          >
            <Tab key="login" title="Entrar">
              <div className="flex flex-col gap-4">
                <Input
                  isRequired
                  classNames={{
                    input:
                      "bg-transparent text-white placeholder:text-gray-500",
                    inputWrapper:
                      "bg-gray-800/50 border border-gray-700/50 hover:border-gray-600 focus-within:border-purple-500 transition-colors",
                    label: "text-gray-300",
                  }}
                  label="Email"
                  placeholder="Digite seu email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  isRequired
                  classNames={{
                    input:
                      "bg-transparent text-white placeholder:text-gray-500",
                    inputWrapper:
                      "bg-gray-800/50 border border-gray-700/50 hover:border-gray-600 focus-within:border-purple-500 transition-colors",
                    label: "text-gray-300",
                  }}
                  label="Senha"
                  placeholder="Digite sua senha"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold transition-all duration-200 transform hover:scale-105"
                  isLoading={isLoading}
                  size="lg"
                  onPress={handleEmailPasswordLogin}
                >
                  Entrar
                </Button>
              </div>
            </Tab>

            <Tab key="register" title="Cadastrar">
              <div className="flex flex-col gap-4">
                <Input
                  isRequired
                  classNames={{
                    input:
                      "bg-transparent text-white placeholder:text-gray-500",
                    inputWrapper:
                      "bg-gray-800/50 border border-gray-700/50 hover:border-gray-600 focus-within:border-green-500 transition-colors",
                    label: "text-gray-300",
                  }}
                  label="Email"
                  placeholder="Digite seu email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  isRequired
                  classNames={{
                    input:
                      "bg-transparent text-white placeholder:text-gray-500",
                    inputWrapper:
                      "bg-gray-800/50 border border-gray-700/50 hover:border-gray-600 focus-within:border-green-500 transition-colors",
                    label: "text-gray-300",
                  }}
                  label="Senha"
                  placeholder="Digite sua senha (mín. 6 caracteres)"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold transition-all duration-200 transform hover:scale-105"
                  isLoading={isLoading}
                  size="lg"
                  onPress={handleEmailPasswordRegister}
                >
                  Criar Conta
                </Button>
              </div>
            </Tab>

            <Tab key="emaillink" title="Link por Email">
              <div className="flex flex-col gap-4">
                <Input
                  isRequired
                  classNames={{
                    input:
                      "bg-transparent text-white placeholder:text-gray-500",
                    inputWrapper:
                      "bg-gray-800/50 border border-gray-700/50 hover:border-gray-600 focus-within:border-indigo-500 transition-colors",
                    label: "text-gray-300",
                  }}
                  label="Email"
                  placeholder="Digite seu email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Button
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold transition-all duration-200 transform hover:scale-105"
                  isLoading={isLoading}
                  size="lg"
                  onPress={handleEmailLinkLogin}
                >
                  Enviar Link de Login
                </Button>
                <p className="text-xs text-gray-400 text-center leading-relaxed">
                  Você receberá um link por email para fazer login sem senha
                </p>
              </div>
            </Tab>
          </Tabs>
        </CardBody>
      </Card>
    </div>
  );
};

export default Login;
