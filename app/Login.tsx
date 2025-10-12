"use client";

import React from "react";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { SiGoogle } from "react-icons/si";

interface LoginProps {
  handleGoogleLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ handleGoogleLogin }) => {
  return (
    <div className="min-h-screen flex items-center justify-center ">
      <Card>
        <CardHeader className="flex flex-col items-center gap-2">
              <h4 className="font-bold text-lg">CODM Social Network</h4>
          <p className="text-sm text-gray-500 text-center">
            Entre com sua conta Google para continuar
          </p>
        </CardHeader>
        <CardBody className="flex justify-center mt-0">
          <Button
            onPress={handleGoogleLogin}
            size="lg"
          >
            <SiGoogle className="w-5 h-5 mr-2" />
          </Button>
        </CardBody>
      </Card>
    </div>
  );
};

export default Login;