import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Flame Tool",
  description: "Point The Flame Tool at a high-school problem and get the final answer.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${GeistSans.variable} h-full antialiased`}>
      <body className={`${GeistSans.className} min-h-full`}>{children}</body>
    </html>
  );
}
