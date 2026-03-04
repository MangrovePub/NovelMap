/**
 * NovelMap UI
 * Copyright (c) 2026 Robert Cummer, Mangrove Publishing LLC
 * Licensed under the MIT License
 */

import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router";
import { App } from "./App.tsx";
import { LoginPage } from "./components/auth/LoginPage.tsx";
import "./styles/globals.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function Root() {
  const [authed, setAuthed] = useState(() => !!localStorage.getItem("studio-token"));
  if (!authed) return <LoginPage onLogin={() => setAuthed(true)} />;
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
