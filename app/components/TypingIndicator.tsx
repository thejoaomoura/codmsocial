"use client";

import React from "react";

interface TypingIndicatorProps {
  isVisible: boolean;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="typing-indicator-container">
      <div className="typing-indicator-bubble">
        <div className="typing-dots">
          <div className="dot dot-1" />
          <div className="dot dot-2" />
          <div className="dot dot-3" />
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
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

        .typing-indicator-container {
          display: flex;
          justify-content: flex-start;
          margin-bottom: 8px;
          animation: fadeIn 0.3s ease-in-out;
        }

        .typing-indicator-bubble {
          padding: 8px 12px;
          border-radius: 12px;
          background: hsl(var(--heroui-default-100));
          border: 1px solid hsl(var(--heroui-default-200));
          max-width: 70%;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 60px;
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

        .dot-1 {
          animation-delay: 0s;
        }

        .dot-2 {
          animation-delay: 0.2s;
        }

        .dot-3 {
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
      `,
        }}
      />
    </div>
  );
};

export default TypingIndicator;
