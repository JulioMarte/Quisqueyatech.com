import { api } from "@/convex/_generated/api";
import { seedPosts } from "@/lib/content";
import {
  adminException,
  adminFailure,
  adminJson,
  authorizeContentRequest,
  requestId,
} from "@/lib/server/admin-content";
import { fetchAuthMutation } from "@/lib/server/auth-server";

export async function POST(request: Request) {
  const trace = requestId(request);
  try {
    if (!(await authorizeContentRequest(request))) return adminFailure(trace, "Unauthorized", 401);
    const data = await fetchAuthMutation(api.posts.adminSeed, {
      posts: seedPosts.map((post) => ({
        ...post,
        publishedAt: new Date(post.publishedAt).getTime(),
      })),
    });
    return adminJson(trace, data);
  } catch (error) {
    return adminException(trace, "posts.seed", error);
  }
}
