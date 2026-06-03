import { createNavigationContainerRef } from '@react-navigation/native';

// Shared ref so components rendered above the navigators (e.g. MainTabs, which
// renders the Tab.Navigator itself) can still trigger navigation.
export const navigationRef = createNavigationContainerRef();
