import type { Config } from "jest";

const config: Config = {
  testEnvironment: "jest-environment-jsdom",
  preset: "ts-jest",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", {
      tsconfig: {
        jsx: "react-jsx",
        moduleResolution: "node",
      },
    }],
  },
  setupFilesAfterEnv: ["@testing-library/jest-dom"],
};

export default config;
