export function shouldFinalizeProviderSession({
  requested,
  sessionStatus,
  completionReason,
}: {
  requested: boolean;
  sessionStatus?: string;
  completionReason?: string;
}) {
  if (sessionStatus === "recovering") return false;
  return requested || completionReason === "close";
}
