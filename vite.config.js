import { defineConfig } from 'vite';
import path from "path";
//import { reactRouter } from "@react-router/dev/vite";
//import { reactRouter } from '@react-router/dev/vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "url";
//const { fileURLToPath } = require("url");
// https://vite.dev/config/
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        //reactRouter(),
        tsconfigPaths(),
    ],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});
