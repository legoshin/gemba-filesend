import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/chip";
import { Icon } from "@/components/icon";

const features = [
  {
    icon: "Lock01",
    title: "End-to-end encryption",
    description:
      "Files are encrypted with AES-128-GCM before leaving your browser. Only the recipient with the link can decrypt them.",
  },
  {
    icon: "Clock",
    title: "Auto-expiring links",
    description:
      "Set download limits and expiry times. Files are automatically deleted after conditions are met.",
  },
  {
    icon: "Shield01",
    title: "Password protection",
    description:
      "Add an extra layer of security with optional password protection on your shared files.",
  },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      {/* Hero */}
      <section className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
        <h1 className="gemba-h1">Share files securely, simply</h1>
        <p className="gemba-body max-w-lg text-muted-foreground">
          Upload your files with client-side encryption, share a link, and
          let your recipient download with ease.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Link href="/upload">
            <Button size="default">
              <Icon name="Upload01" size={20} />
              Send a file
            </Button>
          </Link>
          <Link href="/download">
            <Button variant="secondary" size="default">
              <Icon name="Download01" size={20} />
              Receive a file
            </Button>
          </Link>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Chip variant="neutral">OPEN SOURCE</Chip>
          <Chip variant="accent">END-TO-END ENCRYPTED</Chip>
        </div>
      </section>

      {/* Feature row */}
      <section className="mt-[var(--space-8)] grid gap-6 sm:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.title}>
            <CardHeader>
              <div className="mb-2 flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-subdued)]">
                <Icon name={feature.icon} size={20} className="text-primary" />
              </div>
              <CardTitle className="gemba-h4">{feature.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="gemba-body text-muted-foreground">
                {feature.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
