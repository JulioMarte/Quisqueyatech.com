import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
const crons = cronJobs();
crons.daily("retention cleanup", { hourUTC: 5, minuteUTC: 15 }, internal.retention.cleanup);
crons.interval("publish scheduled posts", { minutes: 1 }, internal.posts.publishDue);
crons.interval("authentication cleanup", { hours: 1 }, internal.auth.cleanup);
crons.interval("deliver appointment webhooks", { minutes: 1 }, internal.webhookDelivery.processDue);
export default crons;
