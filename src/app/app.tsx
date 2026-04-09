import "@/app/api/setup";
import { RouterProvider } from "react-router-dom";

import "@/app/i18n";
import { AppProviders } from "@/app/providers";
import { router } from "@/app/router";
import "@/app/styles/index.css";

export default function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
