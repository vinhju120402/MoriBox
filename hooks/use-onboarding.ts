'use client';

import { useState } from 'react';

// Shows the welcome walkthrough every time the homepage is entered —
// no localStorage "seen it already" flag, so it always plays before
// the storefront appears.
export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(true);

  const completeOnboarding = () => setShowOnboarding(false);

  return { showOnboarding, completeOnboarding };
}
