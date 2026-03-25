import { getProductionApiSetupMessage } from "../src/services/http.js";

export default [
  {
    name: "production setup message explains missing live API wiring",
    run: () => {
      const message = getProductionApiSetupMessage({ PROD: true, VITE_API_BASE_URL: "" });

      if (!message.includes("VITE_API_BASE_URL") || !message.includes("repository variables")) {
        throw new Error(`Expected deployment hint, received: ${message}`);
      }
    }
  }
];
