import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getProfile from "./tools/get-profile";
import listCheckins from "./tools/list-checkins";
import logCheckin from "./tools/log-checkin";
import listScreenings from "./tools/list-screenings";
import listAlerts from "./tools/list-alerts";
import listEducation from "./tools/list-education";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "vela-support-from-the-start-for-every-family",
  title: "Vela; Support from the Start for Every Family",
  version: "0.1.0",
  instructions:
    "Tools for Vela, a fourth-trimester support companion. Read the signed-in parent's profile, daily check-ins, EPDS screenings, and support notices, log a new daily check-in, and browse the learning library. Keep the tone warm and non-clinical; Vela does not provide medical advice or emergency care.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getProfile, listCheckins, logCheckin, listScreenings, listAlerts, listEducation],
});
