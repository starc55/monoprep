import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const canUploadSourceMaps = Boolean(
    env.SENTRY_AUTH_TOKEN && env.SENTRY_ORG && env.SENTRY_PROJECT
  );

  return {
    plugins: [
      react(),
      canUploadSourceMaps && sentryVitePlugin({
        authToken: env.SENTRY_AUTH_TOKEN,
        org: env.SENTRY_ORG,
        project: env.SENTRY_PROJECT,
        release: env.VITE_SENTRY_RELEASE ? { name: env.VITE_SENTRY_RELEASE } : undefined,
        sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
        telemetry: false
      })
    ].filter(Boolean),
    build: {
      sourcemap: canUploadSourceMaps ? 'hidden' : false
    },
    server: {
      port: 5173
    }
  };
});
