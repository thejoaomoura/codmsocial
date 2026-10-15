"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Tabs, Tab } from "@heroui/tabs";
import { FcGoogle } from "react-icons/fc";
import { addToast } from "@heroui/toast";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendSignInLinkToEmail,
  sendPasswordResetEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from "firebase/auth";
import {
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import DotMatrixBackground from "../components/ui/dot-matrix-background";
import { siteConfig } from "../config/site";
import { fontLogo } from "../config/fonts";
import { getAuthErrorMessage } from "../lib/firebase-auth-errors";

import { auth, db } from "./firebase";

// "CODM Arena" vira o logotipo CODM/ARENA
const [brandFirstWord, ...brandOtherWords] = siteConfig.name.split(" ");
const brandFirst = brandFirstWord.toUpperCase();
const brandRest = brandOtherWords.join(" ").toUpperCase();

// Estilo monocromático, no padrão do fundo de pontos
const inputClassNames = {
  input: "bg-transparent text-sm text-white placeholder:text-neutral-500",
  inputWrapper:
    "bg-black border border-[#333] rounded-md shadow-none hover:border-neutral-500 focus-within:!border-neutral-300 transition-colors",
  label: "text-neutral-400",
};
const primaryButton =
  "w-full rounded-md bg-[#ededed] text-sm font-medium text-black hover:bg-white transition-colors";
const secondaryButton =
  "w-full rounded-md border border-[#333] bg-transparent text-sm font-medium text-white hover:bg-white/5 transition-colors";
const ghostButton = "w-full text-neutral-500 hover:text-white";
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
        description: getAuthErrorMessage(error, "Não foi possível entrar. Tente novamente."),
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
        description: getAuthErrorMessage(error, "Não foi possível criar a conta. Tente novamente."),
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
        description: getAuthErrorMessage(error, "Não foi possível enviar o link. Tente novamente."),
        color: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
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
      await sendPasswordResetEmail(auth, email);
      addToast({
        title: "Email enviado",
        description:
          "Se existir uma conta com esse email, você receberá um link para redefinir a senha",
        color: "success",
      });
    } catch (error: any) {
      // Não revela se o email existe: só informa erros de formato ou limite de envios
      const showableErrors = [
        "auth/invalid-email",
        "auth/too-many-requests",
        "auth/network-request-failed",
      ];

      if (showableErrors.includes(error?.code)) {
        addToast({
          title: "Erro ao enviar email",
          description: getAuthErrorMessage(error),
          color: "danger",
        });
      } else {
        addToast({
          title: "Email enviado",
          description:
            "Se existir uma conta com esse email, você receberá um link para redefinir a senha",
          color: "success",
        });
      }
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
              description: getAuthErrorMessage(
                error,
                "Não foi possível confirmar o login pelo link. Tente novamente.",
              ),
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
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden p-4 bg-black">
      {/* Fundo de pontos animado (WebGL) com vinheta para dar foco ao card */}
      <DotMatrixBackground className="absolute inset-0 z-0 h-full w-full" />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.75)_0%,rgba(0,0,0,0)_100%)]" />

      <Card className="w-full max-w-md bg-[#121212] border border-[#222] shadow-[0_10px_40px_rgba(0,0,0,0.8)] relative z-10">
        <CardHeader className="flex flex-col items-center gap-4 pb-6">
          <div className="text-center">
            <h1
              aria-label={siteConfig.name}
              className={`${fontLogo.className} mb-3 -skew-x-6 select-none text-7xl font-black leading-none tracking-tight text-white`}
            >
              <span aria-hidden="true">{brandFirst}</span>
              <span
                aria-hidden="true"
                className="mx-1.5 text-neutral-500"
              >
                /
              </span>
              <span aria-hidden="true">{brandRest}</span>
            </h1>
            <p className="text-sm text-neutral-500">
              Entre com sua conta para continuar
            </p>
          </div>
        </CardHeader>

        <CardBody className="flex flex-col gap-6 pt-0">
          <Button
            className={secondaryButton}
            size="md"
            startContent={<FcGoogle className="w-4 h-4" />}
            onPress={handleGoogleLogin}
          >
            Entrar com Google
          </Button>

          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-[#222]" />
            <span className="text-sm text-neutral-500">ou</span>
            <div className="h-px flex-1 bg-[#222]" />
          </div>

          <Tabs
            className="w-full flex flex-col items-center"
            classNames={{
              tabList: "bg-black border border-[#333] rounded-md flex justify-center",
              tab: "rounded-md",
              tabContent:
                "text-neutral-500 group-data-[selected=true]:text-black font-medium",
              cursor: "!bg-[#ededed] rounded-md shadow-none",
              panel: "pt-6 w-full",
            }}
            selectedKey={activeTab}
            onSelectionChange={(key) => setActiveTab(key as string)}
          >
            <Tab key="login" title="Entrar">
              <div className="flex flex-col gap-4">
                <Input
                  isRequired
                  classNames={inputClassNames}
                  label="Email"
                  placeholder="Digite seu email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  isRequired
                  classNames={inputClassNames}
                  label="Senha"
                  placeholder="Digite sua senha"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button
                  className={primaryButton}
                  isLoading={isLoading}
                  size="md"
                  onPress={handleEmailPasswordLogin}
                >
                  Entrar
                </Button>
                <Button
                  className={ghostButton}
                  size="sm"
                  variant="light"
                  onPress={() => setActiveTab("reset")}
                >
                  Esqueci minha senha
                </Button>
              </div>
            </Tab>

            <Tab key="register" title="Cadastrar">
              <div className="flex flex-col gap-4">
                <Input
                  isRequired
                  classNames={inputClassNames}
                  label="Email"
                  placeholder="Digite seu email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  isRequired
                  classNames={inputClassNames}
                  label="Senha"
                  placeholder="Digite sua senha (mín. 6 caracteres)"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button
                  className={primaryButton}
                  isLoading={isLoading}
                  size="md"
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
                  classNames={inputClassNames}
                  label="Email"
                  placeholder="Digite seu email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Button
                  className={primaryButton}
                  isLoading={isLoading}
                  size="md"
                  onPress={handleEmailLinkLogin}
                >
                  Enviar Link de Login
                </Button>
                <p className="text-xs text-gray-400 text-center leading-relaxed">
                  Você receberá um link por email para fazer login sem senha
                </p>
              </div>
            </Tab>

            <Tab key="reset" title="Recuperar Senha">
              <div className="flex flex-col gap-4">
                <Input
                  isRequired
                  classNames={inputClassNames}
                  label="Email"
                  placeholder="Digite o email da sua conta"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Button
                  className={primaryButton}
                  isLoading={isLoading}
                  size="md"
                  onPress={handlePasswordReset}
                >
                  Enviar Link de Recuperação
                </Button>
                <p className="text-xs text-gray-400 text-center leading-relaxed">
                  Você receberá um email com um link para criar uma nova senha
                </p>
                <Button
                  className={ghostButton}
                  size="sm"
                  variant="light"
                  onPress={() => setActiveTab("login")}
                >
                  Voltar para o login
                </Button>
              </div>
            </Tab>
          </Tabs>
        </CardBody>
      </Card>
    </div>
  );
};

export default Login;
