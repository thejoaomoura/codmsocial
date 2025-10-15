"use client";

import React from "react";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { SiGoogle, SiApple } from "react-icons/si";
import { addToast } from "@heroui/toast";

interface LoginProps {
  handleGoogleLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ handleGoogleLogin }) => {
  const handleAppleLogin = () => {
    // TODO: Implementar Sign in with Apple quando as chaves estiverem configuradas
    addToast({
      title: "Em desenvolvimento",
      description: "Sign in with Apple será implementado em breve",
      color: "warning"
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center ">
      <Card>
        <CardHeader className="flex flex-col items-center gap-2">
              <h4 className="font-bold text-lg">Gaming Social Network</h4>
          <p className="text-sm text-gray-500 text-center">
            Entre com sua conta para continuar
          </p>
        </CardHeader>
        <CardBody className="flex flex-col gap-3 justify-center mt-0">
          <Button
            onPress={handleGoogleLogin}
            size="lg"
            className="w-full"
          >
            <SiGoogle className="w-5 h-5 mr-2" />
            Entrar com Google
          </Button>
          
          <Button
            onPress={handleAppleLogin}
            size="lg"
            className="w-full"
            color="default"
            variant="bordered"
          >
            <SiApple className="w-5 h-5 mr-2" />
            Entrar com Apple
          </Button>
        </CardBody>
      </Card>
    </div>
  );
};

export default Login;