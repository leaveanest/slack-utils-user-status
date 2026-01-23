import { Manifest } from "deno-slack-sdk/mod.ts";
import { ExampleFunctionDefinition } from "./functions/example_function/mod.ts";
import { SetStatusDefinition } from "./functions/set_status/mod.ts";
import { ClearStatusDefinition } from "./functions/clear_status/mod.ts";
import { GetStatusDefinition } from "./functions/get_status/mod.ts";
import { ListPresetsDefinition } from "./functions/list_presets/mod.ts";
import { CreatePresetDefinition } from "./functions/create_preset/mod.ts";
import { DeletePresetDefinition } from "./functions/delete_preset/mod.ts";
import { ApplyPresetDefinition } from "./functions/apply_preset/mod.ts";
import { ShowStatusFormDefinition } from "./functions/show_status_form/mod.ts";
import { ShowPresetSelectorDefinition } from "./functions/show_preset_selector/mod.ts";
import ExampleWorkflow from "./workflows/example_workflow.ts";
import { SetStatusWorkflow } from "./workflows/set_status_workflow.ts";
import { QuickStatusWorkflow } from "./workflows/quick_status_workflow.ts";
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
  workflows: [ExampleWorkflow, SetStatusWorkflow, QuickStatusWorkflow],
  functions: [
    ExampleFunctionDefinition,
    SetStatusDefinition,
    ClearStatusDefinition,
    GetStatusDefinition,
    ListPresetsDefinition,
    CreatePresetDefinition,
    DeletePresetDefinition,
    ApplyPresetDefinition,
    ShowStatusFormDefinition,
    ShowPresetSelectorDefinition,
  ],
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
