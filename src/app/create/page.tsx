
"use client";

import { TokenCreateForm } from "@/components/token-create-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function CreateTokenPage() {
  return (
    <div className="w-full max-w-2xl mx-auto">
        <TokenCreateForm />
    </div>
  );
}
