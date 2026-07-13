import { NextResponse } from "next/server";
import { seedPosts } from "@/lib/content";
import { authorizeContentRequest, adminSecret, requestId } from "@/lib/server/admin-content";
import { convexMutation } from "@/lib/server/convex";

export async function POST(request: Request) {
  const trace = requestId(request);
  if (!(await authorizeContentRequest(request))) return NextResponse.json({ data: null, error: "Unauthorized", requestId: trace }, { status: 401 });
  try { const data = await convexMutation("posts:serverSeed", { secret: adminSecret(), posts: seedPosts.map((post) => ({ ...post, publishedAt: new Date(post.publishedAt).getTime() })) }); return NextResponse.json({ data, error: null, requestId: trace }); }
  catch (error) { return NextResponse.json({ data: null, error: error instanceof Error ? error.message : "Could not migrate seed content", requestId: trace }, { status: 503 }); }
}
