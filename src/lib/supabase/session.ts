import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = ["/login", "/auth", "/pending", "/preview"];

/** Refreshes the Supabase session on every request and gates private routes. */
export async function updateSession(request: NextRequest) {
  // The OAuth callback owns the cookie jar until the code exchange finishes.
  // Building a server client here calls getUser() on a request that has no
  // session yet, and @supabase/ssr answers that by clearing every cookie under
  // its storage key — including sb-<ref>-auth-token-code-verifier, the PKCE
  // verifier the callback is about to read. Refreshing a session on the route
  // that creates one is pointless anyway, so leave /auth untouched.
  if (request.nextUrl.pathname.startsWith("/auth")) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not remove: this refreshes the auth token on every request.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  return response;
}
