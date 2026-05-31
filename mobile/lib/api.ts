/**
 * API client for the Shure.Fund mobile app.
 * Re-exports the shared API functions with the base URL configured
 * from EXPO_PUBLIC_API_URL env variable.
 */

import {
  listProjects,
  createProject,
  getFundingPosition,
  listVariations,
  getVariation,
  createVariation,
  transitionVariation,
  listDisputes,
  createDispute,
  transitionDispute,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../src/web-app/lib/api";
import { supabase } from "./supabase";

function getApiOpts() {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? "";
  // Get the current session token to pass in Authorization header
  return { baseUrl };
}

export {
  listProjects,
  createProject,
  getFundingPosition,
  listVariations,
  getVariation,
  createVariation,
  transitionVariation,
  listDisputes,
  createDispute,
  transitionDispute,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
};

export { getApiOpts, supabase };
