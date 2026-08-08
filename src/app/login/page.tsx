import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full">
      <div className="relative hidden w-1/2 flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-white/10">
            <ShieldCheck className="size-5" />
          </div>
          <span className="text-lg font-semibold">MedCheck</span>
        </div>
        <div className="max-w-md space-y-4">
          <h1 className="text-3xl font-semibold leading-tight">
            Governança e validação documental de atestados médicos.
          </h1>
          <p className="text-sm text-primary-foreground/70">
            Automação, apoio de IA e revisão humana para decisões auditáveis, rastreáveis e
            juridicamente seguras.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/50">
          &copy; {new Date().getFullYear()} MedCheck. Plataforma de validação documental.
        </p>
      </div>
      <div className="flex w-full flex-col items-center justify-center px-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col gap-1 lg:hidden">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-6 text-primary" />
              <span className="text-lg font-semibold">MedCheck</span>
            </div>
          </div>
          <h2 className="text-xl font-semibold">Entrar na plataforma</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Acesse com as credenciais fornecidas pela sua organização.
          </p>
          <LoginForm />
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Esqueceu sua senha?{" "}
            <Link href="/forgot-password" className="font-medium text-primary hover:underline">
              Recuperar acesso
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
