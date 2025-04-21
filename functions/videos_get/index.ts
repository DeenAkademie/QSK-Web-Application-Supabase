// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../cors.ts";

interface VideoProgress {
  status: string;
  progress_percent: number;
  last_position_seconds: number;
}

interface Video {
  id: string;
  title: string;
  section_id: string;
  thumbnail: string;
  vimeo_id: string | null;
  exercise_id: string | null;
  display_order: number | null;
  completed: boolean;
  progress: VideoProgress;
}

interface Section {
  id: string;
  module_id: string;
  title: string;
  display_order: number;
  completed: boolean;
  completion_percent: number;
  videos: Video[];
}

interface VideoModule {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  display_order: number;
  completed: boolean;
  completion_percent: number;
  sections: Section[];
}

serve(async (req): Promise<Response> => {
  console.log("Received request to videos_get function");

  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) {
    console.log("Responding to CORS preflight request");
    return corsResponse;
  }

  try {
    const payload = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("No user found");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Authentication required",
          meta: {
            timestamp: new Date().toISOString(),
            operation: "videos_get",
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

    console.log("Getting videos for user:", user.id);
    // Get all modules with their sections and videos in a single query
    const { data: modules, error: modulesError } = await supabase
      .from("course_modules")
      .select(`
        *,
        course_sections (
          *,
          course_videos (
            *,
            clients_course_progress!inner (
              updated_at
            )
          )
        )
      `)
      .order("display_order", { ascending: true });

    if (modulesError) throw modulesError;

    const modulesWithData: VideoModule[] = modules.map((module: any) => {
      const sectionsWithVideos = module.course_sections.map((section: any) => {
        const videosWithProgress = section.course_videos.map((video: any) => {
          const progress = video.clients_course_progress[0];
          const completed = !!progress;

          return {
            id: video.id,
            title: video.title,
            section_id: video.section_id,
            thumbnail: video.thumbnail,
            vimeo_id: video.vimeo_id,
            exercise_id: video.exercise_id,
            display_order: video.display_order,
            completed,
            progress: {
              progress_percent: completed ? 100 : 0,
              status: completed ? "completed" : "locked",
              last_position_seconds: 0,
            },
          };
        });

        const completedVideosInSection = videosWithProgress.filter((v: Video) => v.completed).length;
        const sectionCompleted = videosWithProgress.length > 0 && 
          completedVideosInSection === videosWithProgress.length;
        const sectionCompletionPercent = videosWithProgress.length > 0
          ? Math.floor(completedVideosInSection / videosWithProgress.length * 100)
          : 0;

        return {
          id: section.id,
          module_id: section.module_id,
          title: section.title,
          display_order: section.display_order,
          completed: sectionCompleted,
          completion_percent: sectionCompletionPercent,
          videos: videosWithProgress,
        };
      });

      const moduleCompletedVideosCount = sectionsWithVideos.reduce(
        (acc: number, section: Section) => acc + section.videos.filter((v: Video) => v.completed).length,
        0
      );
      const moduleTotalVideosCount = sectionsWithVideos.reduce(
        (acc: number, section: Section) => acc + section.videos.length,
        0
      );
      const moduleCompletionPercent = moduleTotalVideosCount > 0
        ? Math.floor(moduleCompletedVideosCount / moduleTotalVideosCount * 100)
        : 0;
      const moduleCompleted = moduleTotalVideosCount > 0 && 
        moduleCompletedVideosCount === moduleTotalVideosCount;

      return {
        id: module.id,
        title: module.title,
        description: module.description,
        thumbnail: module.thumbnail,
        display_order: module.display_order,
        completed: moduleCompleted,
        completion_percent: moduleCompletionPercent,
        sections: sectionsWithVideos,
      };
    });

    // Handle video unlocking logic
    for (let i = 0; i < modulesWithData.length; i++) {
      const module = modulesWithData[i];
      if (i === 0 || modulesWithData[i - 1].completed) {
        if (module.sections.length > 0 && module.sections[0].videos.length > 0) {
          const firstSection = module.sections[0];
          const firstVideo = firstSection.videos[0];
          
          await supabase.from("clients_course_progress").upsert({
            client_id: user.id,
            module_id: module.id,
            section_id: firstSection.id,
            video_id: firstVideo.id,
            updated_at: new Date().toISOString(),
          });
        }
      }

      for (const section of module.sections) {
        for (let j = 0; j < section.videos.length; j++) {
          const video = section.videos[j];
          const isPrevVideoCompleted = j === 0 || section.videos[j - 1].completed;
          if (isPrevVideoCompleted) {
            await supabase.from("clients_course_progress").upsert({
              client_id: user.id,
              module_id: module.id,
              section_id: section.id,
              video_id: video.id,
              updated_at: new Date().toISOString(),
            });
          }
        }
      }
    }

    const responseModules = payload.module_id
      ? modulesWithData.filter((m: VideoModule) => m.id === payload.module_id)
      : modulesWithData;

    return new Response(
      JSON.stringify({
        success: true,
        data: responseModules,
        meta: {
          timestamp: new Date().toISOString(),
          operation: "videos_get",
        },
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("Error in videos_get:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        meta: {
          timestamp: new Date().toISOString(),
          operation: "videos_get",
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
