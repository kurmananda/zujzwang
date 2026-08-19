import { Inter, JetBrains_Mono, Playfair_Display } from "next/font/google";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import FloatingNewGameButton from "@/components/FloatingNewGameButton";
import NewGameModal from "@/components/NewGameModal";
import { NewGameModalProvider } from "@/components/NewGameModalContext";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata = {
  title: "ZUJZWANG — College Chess Club",
  description: "Zujzwang, the college chess club: ratings, tournaments, and friendly games for the campus chess community.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NewGameModalProvider>
          <NavBar />
          <main className="flex-1">{children}</main>
          <Footer />
          <FloatingNewGameButton />
          <NewGameModal />
        </NewGameModalProvider>
      </body>
    </html>
  );
}
