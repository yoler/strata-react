import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";

import { loginSchema, type LoginFormValues } from "@/modules/auth/schema";
import { useAuthStore } from "@/modules/auth/store";
import { useLoginMutation } from "@/modules/auth/use-auth";
import { ENV } from "@/shared/config/env";
import { ROUTE_PATHS } from "@/shared/constants/route-paths";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

export function LoginPage() {
  const { t } = useTranslation();
  const loginMutation = useLoginMutation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "demo",
      password: "123456"
    }
  });

  if (isAuthenticated) {
    return <Navigate to={ROUTE_PATHS.dashboard} replace />;
  }

  const onSubmit = form.handleSubmit(async (values) => {
    await loginMutation.mutateAsync(values);
  });

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">{t("auth.title")}</CardTitle>
        <CardDescription>{t("auth.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="username">{t("common.username")}</Label>
            <Input id="username" {...form.register("username")} />
            {form.formState.errors.username && <p className="text-destructive text-sm">{form.formState.errors.username.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t("common.password")}</Label>
            <Input id="password" type="password" {...form.register("password")} />
            {form.formState.errors.password && <p className="text-destructive text-sm">{form.formState.errors.password.message}</p>}
          </div>

          {ENV.enableDemoAuth && <p className="text-muted-foreground text-sm">{t("common.demoHint")}</p>}

          <Button className="w-full" disabled={loginMutation.isPending} type="submit">
            {loginMutation.isPending ? t("common.loading") : t("common.login")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

