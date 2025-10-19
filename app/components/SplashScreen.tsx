"use client";

import React from "react";
import { Spinner } from "@heroui/spinner";

const SplashScreen: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center space-y-6">
        {/* Spinner - RGB animado */}
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-transparent bg-gradient-to-r from-red-500 via-green-500 to-blue-500 animate-spin bg-[length:200%_200%] animate-gradient-x">
            <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 scale-75"></div>
          </div>
        </div>
        
        {/* Texto com gradiente RGB */}
        <div className="text-center">
          <h2 className="text-xl font-semibold bg-gradient-to-r from-red-500 via-green-500 to-blue-500 bg-clip-text text-transparent animate-gradient-x bg-[length:200%_200%]">
            Carregando...
          </h2>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes gradient-x {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        
        .animate-gradient-x {
          animation: gradient-x 3s ease infinite;
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;