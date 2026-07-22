import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';

import { App } from './App';

describe('application foundation', () => {
  it('identifies the application and its purpose', () => {
    render(<App />);

    expect(screen.getByText('Opportunity Log')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: /turn workplace ideas into visible progress/i,
      }),
    ).toBeInTheDocument();
  });

  it('has no detectable accessibility violations', async () => {
    const { container } = render(<App />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
