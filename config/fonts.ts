import {
  Big_Shoulders_Display as FontLogo,
  Fira_Code as FontMono,
  Inter as FontSans,
} from "next/font/google";

// Fonte condensada de estilo esportivo, usada só no logotipo
export const fontLogo = FontLogo({
  subsets: ["latin"],
  weight: ["800", "900"],
});

export const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const fontMono = FontMono({
  subsets: ["latin"],
  variable: "--font-mono",
});
