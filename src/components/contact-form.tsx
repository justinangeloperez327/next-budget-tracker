"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
export function ContactForm() {
  const [status, setStatus] = useState("");
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  return (
    <form
      className="mt-8 space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!email) return;
        const data = new FormData(e.currentTarget);
        window.location.href = `mailto:${email}?subject=${encodeURIComponent(String(data.get("subject")))}&body=${encodeURIComponent(String(data.get("message")) + "\n\nFrom: " + data.get("name") + " <" + data.get("email") + ">")}`;
        setStatus(
          "Your email app will open with your message. Send it there to contact us.",
        );
      }}
    >
      {[
        ["name", "Name", "text"],
        ["email", "Email", "email"],
        ["subject", "Subject", "text"],
      ].map(([id, label, type]) => (
        <div className="space-y-2" key={id}>
          <Label htmlFor={id}>{label}</Label>
          <Input id={id} name={id} type={type} required maxLength={200} />
        </div>
      ))}
      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          name="message"
          required
          rows={5}
          maxLength={4000}
        />
      </div>
      {!email && (
        <p className="text-sm text-muted-foreground">
          The contact address has not been configured yet.
        </p>
      )}
      <Button disabled={!email}>Open email draft</Button>
      <p role="status" className="text-sm text-muted-foreground">
        {status}
      </p>
    </form>
  );
}
