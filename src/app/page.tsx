import Link from "next/link";
import {
  ArrowRight,
  Download,
  Lock,
  Shield,
  Timer,
  Upload,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    icon: Lock,
    title: "End-to-End Encryption",
    description:
      "Files are encrypted with AES-128-GCM before leaving your browser. Only the recipient with the link can decrypt them.",
  },
  {
    icon: Timer,
    title: "Auto-Expiring Links",
    description:
      "Set download limits and expiry times. Files are automatically deleted after conditions are met.",
  },
  {
    icon: Shield,
    title: "Password Protection",
    description:
      "Add an extra layer of security with optional password protection on your shared files.",
  },
  {
    icon: Zap,
    title: "Fast Transfers",
    description:
      "Streaming architecture ensures fast uploads and downloads with minimal memory footprint.",
  },
  {
    icon: Download,
    title: "No Account Required",
    description:
      "Start sharing immediately. No sign-up, no email verification, no personal data collected.",
  },
  {
    icon: Upload,
    title: "Large File Support",
    description:
      "Upload files up to 15GB. Directory uploads are automatically archived for convenience.",
  },
];

const steps = [
  {
    step: "01",
    title: "Select Your Files",
    description: "Drag and drop files or click to browse. Directories are supported too.",
  },
  {
    step: "02",
    title: "Configure Options",
    description:
      "Set a password, download limit, or expiry time for extra control.",
  },
  {
    step: "03",
    title: "Share the Link",
    description:
      "Get a secure link to share. Copy it, scan the QR code, or send it directly.",
  },
];

export default function Home() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background" />
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32 lg:py-40">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-6">
              Open Source &middot; End-to-End Encrypted
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Share files{" "}
              <span className="bg-gradient-to-r from-primary/80 to-primary bg-clip-text text-transparent">
                securely
              </span>
              , simply
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl">
              Upload your files with client-side encryption, share a link, and
              let your recipient download with ease. No accounts, no tracking,
              no compromises.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/upload">
                <Button size="lg" className="gap-2 text-base">
                  <Upload className="h-4 w-4" />
                  Start Uploading
                </Button>
              </Link>
              <Link href="/download">
                <Button size="lg" variant="outline" className="gap-2 text-base">
                  Download a File
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Privacy-first file sharing
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Built on proven encryption standards with features designed to
              keep your data safe.
            </p>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="border bg-card/50 transition-colors hover:bg-card"
              >
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              How it works
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Three simple steps to securely share your files.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {steps.map((step) => (
              <div key={step.step} className="relative text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  {step.step}
                </div>
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to share securely?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Start uploading files right now. No sign-up required.
            </p>
            <div className="mt-8">
              <Link href="/upload">
                <Button size="lg" className="gap-2 text-base">
                  <Upload className="h-4 w-4" />
                  Upload Your First File
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
