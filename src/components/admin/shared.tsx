"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-amber-300">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-300 sm:text-base">
          {description}
        </p>
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}

export function FormField({
  label,
  description,
  children,
  className,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label>{label}</Label>
      {children}
      {description ? <p className="text-xs text-stone-500">{description}</p> : null}
    </div>
  );
}

export function ErrorNotice({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
      <span>{message}</span>
    </div>
  );
}

export function SuccessNotice({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
      {message}
    </div>
  );
}

export function LoadingCard({ title = "Loading data..." }: { title?: string }) {
  return (
    <Card>
      <CardContent className="flex min-h-[220px] items-center justify-center gap-3 p-6 text-stone-300">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>{title}</span>
      </CardContent>
    </Card>
  );
}

export function EmptyCard({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {action ? <CardContent>{action}</CardContent> : null}
    </Card>
  );
}

export function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-4xl">{value}</CardTitle>
      </CardHeader>
      {detail ? <CardContent className="text-sm text-stone-400">{detail}</CardContent> : null}
    </Card>
  );
}

export function StatusBadge({ online }: { online: boolean }) {
  return (
    <Badge className="gap-2" variant={online ? "success" : "danger"}>
      <span className="h-2 w-2 rounded-full bg-current" />
      {online ? "Online" : "Offline"}
    </Badge>
  );
}
