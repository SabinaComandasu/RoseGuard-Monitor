/// <reference types="vite/client" />

interface Window {
  google?: {
    accounts: {
      id: {
        initialize: (config: { client_id: string; callback: (r: { credential: string }) => void }) => void
        prompt: () => void
      }
    }
  }
}
