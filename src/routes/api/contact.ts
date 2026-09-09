import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { sendContactMessage } from "@/lib/server/contact-mail";

const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  message: z.string().trim().min(10).max(5000),
});

export const Route = createFileRoute("/api/contact")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const payload = contactSchema.parse(await request.json());
          await sendContactMessage(payload);
          return Response.json({ ok: true });
        } catch (error) {
          if (error instanceof z.ZodError) {
            return Response.json(
              { error: "Please check your name, email, and message." },
              { status: 400 },
            );
          }

          console.error("Contact email unavailable", error);
          return Response.json(
            { error: "We could not send your message right now. Please try again shortly." },
            { status: 503 },
          );
        }
      },
    },
  },
});
