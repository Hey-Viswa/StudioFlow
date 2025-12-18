import { useUser } from "@clerk/clerk-react";
import { Navigate, useSearchParams } from "react-router-dom";

/**
 * SmartRedirect Component
 * 
 * Logic:
 * 1. If User is Logged In -> Redirect to /dashboard
 * 2. If User is Guest -> Show Children (Landing Page)
 * 3. EXCEPTION: If URL has ?noredirect=true, allow Logged In user to see Landing Page
 */
export default function SmartRedirect({ children }) {
  const { isSignedIn, isLoaded } = useUser();
  const [searchParams] = useSearchParams();
  const allowLanding = searchParams.get("noredirect") === "true";

  // Wait for Clerk to load
  if (!isLoaded) {
    return null; // Or a minimal spinner
  }

  if (isSignedIn && !allowLanding) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
