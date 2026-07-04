import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "swiper/swiper-bundle.css";
import "flatpickr/dist/flatpickr.css";
import App from "./App.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx";
import { ThemeProvider } from "./context/ThemeContext.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";
import { SekolahProvider } from "./context/SekolahContext.tsx";
import { SystemSettingsProvider } from "./context/SystemSettingsContext.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <SystemSettingsProvider>
          <SekolahProvider>
            <AppWrapper>
              <App />
            </AppWrapper>
          </SekolahProvider>
        </SystemSettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);
