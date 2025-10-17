"use client";

import React from "react";

interface TypingIndicatorProps {
  isVisible: boolean;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-start",
        marginBottom: 8,
        animation: "fadeIn 0.3s ease-in-out",
      }}
    >
      <div
        style={{
          padding: "8px 12px",
          borderRadius: 12,
          background: "hsl(var(--heroui-default-100))",
          border: "1px solid hsl(var(--heroui-default-200))",
          maxWidth: "70%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: "60px",
        }}
      >
        <div className="typing-dots">
          <div className="dot" />
          <div className="dot" />
          <div className="dot" />
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .typing-dots {
          display: flex;
          gap: 3px;
          align-items: center;
          justify-content: center;
        }

        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: hsl(var(--heroui-default-500));
          animation: typing 1.4s infinite ease-in-out;
        }

        .dot:nth-child(1) {
          animation-delay: 0s;
        }

        .dot:nth-child(2) {
          animation-delay: 0.2s;
        }

        .dot:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes typing {
          0%,
          60%,
          100% {
            transform: translateY(0);
            opacity: 0.4;
          }
          30% {
            transform: translateY(-6px);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default TypingIndicator;
