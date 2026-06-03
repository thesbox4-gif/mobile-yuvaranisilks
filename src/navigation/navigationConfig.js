/** Faster stack transitions — default native push ~300–350ms feels sluggish on tab/stack hops. */
export const STACK_SCREEN_OPTIONS = {
  headerShown: false,
  animation: 'fade',
  animationDuration: 200,
  freezeOnBlur: true,
};

export const TAB_SCREEN_OPTIONS = {
  lazy: true,
  freezeOnBlur: true,
};
