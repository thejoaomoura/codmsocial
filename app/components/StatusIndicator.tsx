"use client";

import React from "react";

interface StatusIndicatorProps {
  status: "online" | "away" | "offline";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ 
  status, 
  size = "md", 
  className = "" 
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "away":
        return "bg-yellow-500";
      case "offline":
        return "bg-red-500";
      default:
        return "bg-gray-400";
    }
  };

  const getSizeClasses = (size: string) => {
    switch (size) {
      case "sm":
        return "w-2 h-2";
      case "md":
        return "w-3 h-3";
      case "lg":
        return "w-4 h-4";
      default:
        return "w-3 h-3";
    }
  };

  return (
    <div 
      className={`
        ${getSizeClasses(size)} 
        ${getStatusColor(status)} 
        rounded-full 
        border-2 
        border-white 
        shadow-sm
        ${className}
      `}
      title={`Status: ${status === "online" ? "Online" : status === "away" ? "Ausente" : "Offline"}`}
    />
  );
};

export default StatusIndicator;
