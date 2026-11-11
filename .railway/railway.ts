import { defineRailway, postgres, project, service, volume } from "railway/iac";

// Railway infrastructure for Society Treasury.
// Preview with `railway config plan`, apply with `railway config apply`.
// Variables are unmanaged: set them in Railway (dashboard or `railway variables --set`),
// never in this file. See .env.example for the list.

const REGION = "europe-west4-drams3a";

export default defineRailway(() => {
  const Postgres = postgres("Postgres", { region: REGION });
  Postgres.networking = { privateNetworkEndpoint: "postgres", tcpProxies: { "5432": {} } };
  const postgresVolume = volume("postgres-volume", { alerts: { usage: { "100": {}, "80": {}, "95": {} } }, allowOnlineResize: true, region: REGION, sizeMB: 50000 });

  // The Next.js app: frontend pages and /api routes in one service.
  const web = service("web", {
    regions: { [REGION]: 1 },
    build: { builder: "RAILPACK" },
    start: "npm run start",
    // Applies database migrations before each deploy; a failure stops the deploy.
    preDeploy: "npm run db:migrate",
    healthcheck: "/api/health",
    healthcheckTimeout: 120,
    deploy: { restartPolicyType: "ON_FAILURE", restartPolicyMaxRetries: 5 },
  });

  return project("society-treasury", {
    variables: { managed: false },
    resources: [Postgres, postgresVolume, web],
  });
});
