import { ContactForm } from "@/components/contact-form";
export default function Contact() {
  return (
    <section className="mx-auto max-w-xl py-16">
      <p className="eyebrow mb-4">Get in touch</p>
      <h1 className="text-3xl font-medium tracking-tight">
        Let’s hear from you.
      </h1>
      <p className="mt-4 text-muted-foreground">
        Have a question or an idea? Write a message below.
      </p>
      <ContactForm />
    </section>
  );
}
