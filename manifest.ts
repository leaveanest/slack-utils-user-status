import { Manifest } from "deno-slack-sdk/mod.ts";
import { ExampleFunctionDefinition } from "./functions/example_function/mod.ts";
import ExampleWorkflow from "./workflows/example_workflow.ts";
import { StatusPresetDatastore } from "./datastores/status_presets.ts";
import { StatusScheduleDatastore } from "./datastores/status_schedules.ts";
import { StatusHistoryDatastore } from "./datastores/status_history.ts";

// Load from environment variables with fallback defaults
const APP_NAME = Deno.env.get("SLACK_APP_NAME") || "Slack Utils Template";
const APP_DESCRIPTION = Deno.env.get("SLACK_APP_DESCRIPTION") ||
  "A template for Slack workflow development";

export default Manifest({
  name: APP_NAME,
  description: APP_DESCRIPTION,
  icon: "assets/icon.png",
  workflows: [ExampleWorkflow],
  functions: [ExampleFunctionDefinition],
  outgoingDomains: [],
  datastores: [
    StatusPresetDatastore,
    StatusScheduleDatastore,
    StatusHistoryDatastore,
  ],
  botScopes: [
    "commands",
    "chat:write",
    "channels:read",
    "groups:read",
    "users:read",
    "users.profile:read",
    "emoji:read",
  ],
  // Note: User scopes (users.profile:write, users.profile:read) for status updates
  // will be handled via external OAuth provider or on-behalf-of user authentication
  // in Phase 2+ implementation
});
