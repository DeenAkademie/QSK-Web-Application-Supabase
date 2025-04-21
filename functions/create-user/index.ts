// supabase/functions/create-user/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../cors.ts";

// Hilfsfunktion, um den Autorisierungstoken aus dem Header zu extrahieren
function getAuthToken(req: Request): string | null {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
        return null;
    }
    // "Bearer TOKEN" Format extrahieren
    const match = authHeader.match(/^Bearer (.*)$/);
    if (!match || match.length < 2) {
        return null;
    }
    return match[1];
}

serve(async (req) => {
    console.log("Received request to create-user function");

    // CORS Preflight-Anfragen behandeln
    const corsResponse = handleCors(req);
    if (corsResponse) {
        console.log("Responding to CORS preflight request");
        return corsResponse;
    }

    // Auth-Token aus Header extrahieren
    const token = getAuthToken(req);
    if (!token) {
        console.error("Missing authorization header");
        return new Response(
            JSON.stringify({
                success: false,
                error: "Authorization header missing",
                meta: {
                    timestamp: new Date().toISOString(),
                    operation: "user_creation",
                },
            }),
            {
                status: 401,
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                },
            },
        );
    }

    try {
        // Alle Daten aus dem Registrierungsformular
        const reqBody = await req.json();
        console.log("Request body received");

        const {
            email,
            password,
            userName,
            firstName,
            lastName,
            gender,
            role = "user",
            plan_id = "quran-lesehack",
        } = reqBody;

        console.log("Processing registration for:", email);

        // Standard-Client mit angemessenen Berechtigungen
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        );

        console.log("Creating user with Supabase Auth");
        // 1. Auth Benutzer erstellen mit der nativen signUp-Methode
        const { data: authData, error: authError } = await supabase.auth.signUp(
            {
                email,
                password,
                options: {
                    data: {
                        userName: userName || email.split("@")[0],
                        firstName: firstName || null,
                        lastName: lastName || null,
                        gender: gender || null,
                        role: role,
                        plan_id: plan_id,
                    },
                },
            },
        );

        if (authError) {
            console.error("Auth error:", authError);
            return new Response(
                JSON.stringify({
                    success: false,
                    error: authError.message,
                    meta: {
                        timestamp: new Date().toISOString(),
                        operation: "user_creation",
                    },
                }),
                {
                    status: 400,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                    },
                },
            );
        }
        console.log("User created in Auth");

        // Admin-Client für Datenbankoperationen (nur falls nötig)
        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        );

        // 2. Client-Eintrag erstellen
        const clientData = {
            client_id: authData.user?.id,
            user_name: userName || email.split("@")[0],
            email: email,
            first_name: firstName || null,
            last_name: lastName || null,
            gender: gender || null,
            role: role,
            plan_id: plan_id,
            is_active: true,
        };

        console.log("Creating client record");

        // Prüfe, ob der Benutzer wirklich erstellt wurde
        if (!authData.user?.id) {
            console.error("No user ID returned from auth");
            return new Response(
                JSON.stringify({
                    success: false,
                    error:
                        "User wurde erstellt, aber keine Benutzer-ID wurde zurückgegeben",
                    meta: {
                        timestamp: new Date().toISOString(),
                        operation: "user_creation",
                    },
                }),
                {
                    status: 400,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                    },
                },
            );
        }

        const { data: insertedClient, error: clientError } = await supabaseAdmin
            .from("clients")
            .insert(clientData)
            .select()
            .single();

        if (clientError) {
            console.error("Client insert error:", clientError);

            try {
                // Stelle sicher, dass du einen Admin-Client mit Service Role Key erstellst

                const adminSupabase = createClient(
                    Deno.env.get("SUPABASE_URL") || "",
                    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
                    {
                        auth: {
                            autoRefreshToken: false,
                            persistSession: false,
                        },
                    },
                );

                const { error: deleteError } = await adminSupabase.auth.admin
                    .deleteUser(
                        authData.user.id,
                    );

                if (deleteError) {
                    console.error("Error deleting user:", deleteError);
                    // Trotz Fehler beim Löschen, Fehlerantwort senden
                }
                console.log("User deleted successfully");
            } catch (deleteUserError) {
                console.error("Failed to delete user:", deleteUserError);
            }

            // Fehlerantwort senden
            return new Response(
                JSON.stringify({
                    success: false,
                    error: `Benutzer konnte nicht erstellt werden!`,
                    meta: {
                        timestamp: new Date().toISOString(),
                        operation: "user_creation",
                    },
                }),
                {
                    status: 400,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                    },
                },
            );
        }

        // Erstelle einen Eintrag in der clients_lesson_state Tabelle
        console.log("Creating lesson state entry for user:", authData.user.id);

        const { data: lessonState, error: lessonStateError } =
            await supabaseAdmin
                .from("clients_lesson_state")
                .insert({
                    client_id: authData.user.id,
                    // Alle anderen Felder haben Default-Werte in der Datenbank
                })
                .select()
                .single();

        if (lessonStateError) {
            console.error("Lesson state creation error:", lessonStateError);
            // Wir geben trotzdem eine erfolgreiche Antwort, da der Client erstellt wurde
            // und ein fehlender Lesson State weniger kritisch ist
        } else {
            console.log("Lesson state created successfully");
        }

        console.log("Creating lesson state entry for user:", authData.user.id);

        const { data: settingsState, error: settingsStateError } =
            await supabaseAdmin
                .from("clients_settings")
                .insert({
                    client_id: authData.user.id,
                    language: "de",
                    notification_live_call: true,
                    notification_learn_reminders: true,
                    notification_feature_updates: true,
                    // notification_newsletter: true,
                    // Alle anderen Felder haben Default-Werte in der Datenbank
                })
                .select()
                .single();

        if (settingsStateError) {
            console.error(
                "client_settings creation error:",
                settingsStateError,
            );
            // Wir geben trotzdem eine erfolgreiche Antwort, da der Client erstellt wurde
            // und ein fehlender client_settings weniger kritisch ist
        } else {
            console.log("client_settings created successfully");
        }

        console.log("Client created successfully");

        // Erfolgreiche Antwort
        return new Response(
            JSON.stringify({
                success: true,
                data: {
                    user: authData.user,
                    client: insertedClient,
                    lesson_state: lessonState || null,
                    settings_state: settingsState || null,
                },
                meta: {
                    timestamp: new Date().toISOString(),
                    operation: "user_creation",
                },
            }),
            {
                status: 201,
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                },
            },
        );
    } catch (error: unknown) {
        console.error(
            "Function error:",
            error instanceof Error ? error.message : String(error),
        );

        // Fehlerantwort
        return new Response(
            JSON.stringify({
                success: false,
                error: error instanceof Error
                    ? error.message
                    : "Unbekannter Fehler",
                meta: {
                    timestamp: new Date().toISOString(),
                    operation: "user_creation",
                },
            }),
            {
                status: 400,
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                },
            },
        );
    }
});
