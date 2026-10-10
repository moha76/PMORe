import "@fontsource-variable/geist"
import "@fontsource-variable/manrope"
import { installDemoTransport } from "./premium/demo"
import {
  StrictMode,
} from "react"

import {
  createRoot,
} from "react-dom/client"

import {
  QueryClientProvider,
} from "@tanstack/react-query"

import {
  RouterProvider,
} from "react-router-dom"

import {
  queryClient,
} from "./app/queryClient"

import {
  router,
} from "./app/router"

import "./premium/premium.css"
import "./premium/workspaces.css"

installDemoTransport()

createRoot(
  document.getElementById("root")!,
).render(
  <StrictMode>
    <QueryClientProvider
      client={queryClient}
    >
      <RouterProvider
        router={router}
      />
    </QueryClientProvider>
  </StrictMode>,
)
