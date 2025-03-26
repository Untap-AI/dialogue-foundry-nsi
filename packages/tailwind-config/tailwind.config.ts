import type { Config } from "tailwindcss";
import rootConfig from "../../tailwind.config.js";

// We want each package to be responsible for its own content.
const config: Omit<Config, "content"> = {
  // Extend from root config
  theme: rootConfig.theme || {},
  plugins: rootConfig.plugins || [],
};
export default config;