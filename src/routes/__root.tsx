import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
} from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";

import { Toaster } from "@/components/ui/sonner";
import { AdminLoginDialog } from "@/components/AdminLoginDialog";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Home, LayoutDashboard, LogOut } from "lucide-react";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold">الصفحة غير موجودة</h2>
        <Link to="/" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90">
          العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">حدث خطأ</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
          >
            إعادة المحاولة
          </button>
          <a href="/" className="rounded-md border px-4 py-2 text-sm hover:bg-accent">الرئيسية</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { title: "المرصة - منصة الإعلانات في موريتانيا" },
      { name: "description", content: "منصة المرصة لإعلانات البيع والكراء والخدمات في موريتانيا" },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});


function Header() {
  const [adminOpen, setAdminOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const clickCount = useRef(0);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
      if (session?.user) {
        setTimeout(async () => {
          const { data } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
          setIsAdmin(!!data?.some((r) => r.role === "admin"));
        }, 0);
      } else {
        setIsAdmin(false);
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
      if (session?.user) {
        supabase.from("user_roles").select("role").eq("user_id", session.user.id).then(({ data }) => {
          setIsAdmin(!!data?.some((r) => r.role === "admin"));
        });
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogoClick = () => {
    clickCount.current += 1;
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => { clickCount.current = 0; }, 1500);
    if (clickCount.current >= 5) {
      clickCount.current = 0;
      setAdminOpen(true);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto flex h-16 items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-2">
          <button
            onClick={handleLogoClick}
            className="select-none text-2xl font-extrabold tracking-tight text-primary"
            aria-label="المرصة"
          >
            المرصة
          </button>
          <span className="hidden text-xs text-muted-foreground sm:inline">إعلانات موريتانيا</span>
        </div>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link to="/" className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent">
            <Home className="size-4" /> <span className="hidden sm:inline">الرئيسية</span>
          </Link>
          <Link to="/post-ad" className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90">
            <Plus className="size-4" /> نشر إعلان
          </Link>
          {isAdmin && (
            <>
              <Link to="/admin" className="inline-flex items-center gap-1 rounded-md border border-primary/40 px-3 py-2 text-sm font-medium text-primary hover:bg-accent">
                <LayoutDashboard className="size-4" /> <span className="hidden sm:inline">لوحة المشرف</span>
              </Link>
              <Button variant="ghost" size="sm" onClick={logout} aria-label="تسجيل خروج">
                <LogOut className="size-4" />
              </Button>
            </>
          )}
        </nav>
      </div>
      <AdminLoginDialog open={adminOpen} onOpenChange={setAdminOpen} />
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t bg-card/50 py-6">
      <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} منصة المرصة - إعلانات موريتانيا
      </div>
    </footer>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <HeadContent />
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
        <Toaster richColors position="top-center" />
      </div>
    </QueryClientProvider>
  );
}
