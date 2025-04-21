// supabase/functions/copecart-webhook/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, corsJsonResponse } from "../cors.ts";

const WEBHOOK_SECRET = Deno.env.get("COPECART_WEBHOOK_SECRET");

serve(async (req) => {
    // CORS Preflight-Anfragen behandeln
    const corsResponse = handleCors(req);
    if (corsResponse) {
        return corsResponse;
    }

    try {
        // Verifiziere den Webhook-Secret (Header oder als Parameter)
        const url = new URL(req.url);
        const providedSecret = req.headers.get("x-copecart-signature") ||
            url.searchParams.get("secret");

        if (providedSecret !== WEBHOOK_SECRET) {
            return corsJsonResponse({ error: "Unauthorized" }, 401);
        }

        // Parse CopeCart-Daten
        const payload = await req.json();
        const {
            event_type, // z.B. 'order.completed', 'subscription.activated'
            customer_email, // Email des Kunden
            product_id, // CopeCart Produkt-ID
            order_id, // CopeCart Bestell-ID
            subscription_id, // Falls Abo-Produkt
            // weitere relevante Felder von CopeCart
        } = payload;

        // Ignoriere, wenn nicht ein relevantes Event
        if (
            !["order.completed", "subscription.activated"].includes(event_type)
        ) {
            return corsJsonResponse({
                status: "ignored",
                reason: "irrelevant event",
            });
        }

        // Supabase Admin-Client
        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        );

        // 1. Plane bestimmen basierend auf product_id
        const planMapping = {
            "cc_product_123": "basic", // CopeCart Produkt-ID zu Plan-Mapping
            "cc_product_456": "premium",
            // weitere Mappings
        };

        // Hole Plan-ID aus der Datenbank basierend auf Mapping
        const { data: planData, error: planError } = await supabaseAdmin
            .from("plans")
            .select("id")
            .eq("title", planMapping[product_id as keyof typeof planMapping] || "basic")
            .single();

        if (planError) throw planError;

        // 2. Prüfen, ob Benutzer bereits existiert
        const { data: existingUser, error: userError } = await supabaseAdmin
            .from("clients")
            .select("client_id")
            .eq("email", customer_email)
            .maybeSingle();

        if (userError) throw userError;

        if (existingUser) {
            // Benutzer existiert - Plan aktualisieren und aktivieren
            const { error: updateError } = await supabaseAdmin
                .from("clients")
                .update({
                    plan_id: planData.id,
                    is_active: true,
                    // Optional: Speichern von CopeCart-Referenzen
                    // copecart_order_id: order_id,
                    // copecart_subscription_id: subscription_id
                })
                .eq("client_id", existingUser.client_id);

            if (updateError) throw updateError;

            return corsJsonResponse({
                status: "success",
                action: "updated",
                user_id: existingUser.client_id,
            });
        } else {
            // Neuen Benutzer erstellen
            // Generiere ein zufälliges Passwort
            const tempPassword = crypto.randomUUID().replace(/-/g, "")
                .substring(0, 12);

            // 1. Auth User erstellen
            const { data: authData, error: authError } = await supabaseAdmin
                .auth.admin.createUser({
                    email: customer_email,
                    password: tempPassword,
                    email_confirm: true,
                });

            if (authError) throw authError;

            // 2. Client-Eintrag erstellen
            const { data: clientData, error: clientError } = await supabaseAdmin
                .from("clients")
                .insert({
                    client_id: authData.user.id,
                    user_name: customer_email.split("@")[0],
                    email: customer_email,
                    is_active: true,
                    plan_id: planData.id,
                    role: "user",
                    // Optional: CopeCart-Referenzen
                    // copecart_order_id: order_id,
                    // copecart_subscription_id: subscription_id
                })
                .select()
                .single();

            if (clientError) throw clientError;

            // 3. Willkommens-E-Mail senden mit temporärem Passwort
            // Hier könntest du eine weitere Funktion aufrufen, um E-Mails zu versenden
            // oder einen externen E-Mail-Service nutzen

            return corsJsonResponse({
                status: "success",
                action: "created",
                user_id: authData.user.id,
                temp_password: tempPassword, // In Produktion nie zurücksenden!
            });
        }
    } catch (error: unknown) {
        return corsJsonResponse({ 
            status: "error",
            message: error instanceof Error ? error.message : "Unbekannter Fehler" 
        }, 400);
    }
});
