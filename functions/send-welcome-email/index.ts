// supabase/functions/send-welcome-email/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { SmtpClient } from "https://deno.land/x/smtp/mod.ts";

const SMTP_CONFIG = {
    hostname: Deno.env.get("SMTP_HOST") || "",
    port: Number(Deno.env.get("SMTP_PORT") || "587"),
    username: Deno.env.get("SMTP_USER") || "",
    password: Deno.env.get("SMTP_PASSWORD") || "",
};

serve(async (req) => {
    try {
        const { email, tempPassword, planName, firstName } = await req.json();

        const client = new SmtpClient();
        await client.connectTLS(SMTP_CONFIG);

        await client.send({
            from: "noreply@deinedomain.de",
            to: email,
            subject: "Willkommen! Dein Zugang wurde freigeschaltet",
            content: `
        <h1>Willkommen bei DeineDomain!</h1>
        <p>Hallo ${firstName || "Neuer Kunde"},</p>
        <p>Vielen Dank für deinen Kauf. Dein Zugang zum ${planName}-Plan wurde freigeschaltet.</p>
        <p>Hier sind deine Zugangsdaten:</p>
        <ul>
          <li>Email: ${email}</li>
          <li>Temporäres Passwort: ${tempPassword}</li>
        </ul>
        <p>Bitte ändere dein Passwort nach dem ersten Login.</p>
        <p><a href="https://deinedomain.de/login">Jetzt einloggen</a></p>
      `,
            html: "true",
        });

        await client.close();

        return new Response(
            JSON.stringify({ status: "success" }),
            {
                headers: { "Content-Type": "application/json" },
                status: 200,
            },
        );
    } catch (error: unknown) {
        return new Response(
            JSON.stringify({
                status: "error",
                message: error instanceof Error
                    ? error.message
                    : "Unbekannter Fehler",
            }),
            {
                headers: { "Content-Type": "application/json" },
                status: 500,
            },
        );
    }
});
