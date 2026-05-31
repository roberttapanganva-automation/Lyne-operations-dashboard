import { ApiAccessClient } from "@/components/automations/ApiAccessClient";
import { Card } from "@/components/ui/Card";
import {
  getApiKeyManagementAccess,
  getApiKeyAccessStatusCode,
} from "@/lib/api-keys/access";
import { listWorkspaceApiKeys } from "@/lib/api-keys/service";

export default async function ApiAccessPage() {
  const access = await getApiKeyManagementAccess();

  if (access.status !== "ready") {
    return (
      <Card className="p-6">
        <p className="text-sm font-semibold text-[var(--ops-text)]">
          API access unavailable
        </p>
        <p className="mt-2 text-sm text-[var(--ops-text-soft)]">
          {access.error.message} ({getApiKeyAccessStatusCode(access.status)})
        </p>
      </Card>
    );
  }

  const apiKeys = await listWorkspaceApiKeys(access);

  return <ApiAccessClient initialApiKeys={apiKeys} />;
}
