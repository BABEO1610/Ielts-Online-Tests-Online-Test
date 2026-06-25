import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';

const ACTIVE_TEST_PATTERN = /^\/tests\/[^/]+\/(?:reading|listening|writing|speaking)$/i;
const RESULT_PATTERN = /^\/results\/([^/]+)$/i;
const REVIEW_PATTERN = /^\/results\/([^/]+)\/detail$/i;

const getPageType = (pathname) => {
  if (ACTIVE_TEST_PATTERN.test(pathname)) return 'active-test';
  if (REVIEW_PATTERN.test(pathname)) return 'review';
  if (RESULT_PATTERN.test(pathname)) return 'result';
  if (pathname === '/tests' || pathname.startsWith('/tests/')) return 'test-list';
  if (pathname === '/library' || pathname.includes('library')) return 'library';
  if (['/reading', '/listening', '/writing', '/speaking'].includes(pathname)) return 'lesson';
  return 'home';
};

const getAttemptId = (pathname) => {
  const reviewMatch = pathname.match(REVIEW_PATTERN);
  if (reviewMatch?.[1]) return reviewMatch[1];

  const resultMatch = pathname.match(RESULT_PATTERN);
  return resultMatch?.[1] || null;
};

export const useAssistantAvailability = () => {
  const location = useLocation();
  const { isAuthenticated, isLoading, user } = useAuth();

  return useMemo(() => {
    const pageType = getPageType(location.pathname);
    const isActiveTest = pageType === 'active-test';
    const searchParams = new URLSearchParams(location.search);

    return {
      isVisible: !isActiveTest,
      isDisabled: isActiveTest || isLoading,
      isAuthenticated,
      isGuest: !isLoading && !isAuthenticated,
      user,
      pageType,
      route: location.pathname,
      attemptId: getAttemptId(location.pathname),
      questionId: searchParams.get('questionId'),
      disabledReason: isActiveTest ? 'ASSISTANT_DISABLED_DURING_TEST' : null,
    };
  }, [isAuthenticated, isLoading, location.pathname, location.search, user]);
};

export default useAssistantAvailability;
