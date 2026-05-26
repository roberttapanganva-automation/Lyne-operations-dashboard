import { AssignmentRuleSettings } from "@/components/owner/assignments/AssignmentRuleSettings";
import {
  getAssignableMembersForActiveWorkspace,
  getAssignmentRulesForActiveWorkspace,
} from "@/lib/assignments/queries";

export default async function OwnerAssignmentsPage() {
  const [members, rules] = await Promise.all([
    getAssignableMembersForActiveWorkspace(),
    getAssignmentRulesForActiveWorkspace(),
  ]);

  return <AssignmentRuleSettings members={members} rules={rules} />;
}
