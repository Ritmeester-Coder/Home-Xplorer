import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://dvzmtobhlgryvcocvgda.supabase.co";

const supabasePublishableKey = "sb_publishable_CjIFdPbMKHg_Pep7C2SShA_Yw3sR5PP"

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey
);