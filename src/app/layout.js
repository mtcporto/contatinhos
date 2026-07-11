import "./globals.css";

export const metadata = {
  title: "Contatinhos",
  description: "24 personagens únicos para conversar",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
