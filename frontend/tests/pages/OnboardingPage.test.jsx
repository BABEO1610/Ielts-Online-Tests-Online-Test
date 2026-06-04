import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import OnboardingPage from '../../src/pages/OnboardingPage';

vi.mock('../../src/components/auth/OnboardingForm', () => ({
  default: () => <div data-testid="mock-onboarding-form">Mock Onboarding Form</div>
}));

describe('OnboardingPage Component', () => {
  it('renders page layout correctly with the form', () => {
    render(
      <BrowserRouter>
        <OnboardingPage />
      </BrowserRouter>
    );

    expect(screen.getByTestId('mock-onboarding-form')).toBeInTheDocument();
  });
});
