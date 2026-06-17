import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ResourceCard from '../../../../src/components/library/ResourceCard';

describe('ResourceCard component', () => {
  const mockResource = {
    id: 1,
    title: 'Test PDF',
    description: 'Test description',
    resource_type: 'pdf',
    file_size_bytes: 1048576, // 1MB
    created_at: '2023-01-01T00:00:00Z',
    is_published: true
  };

  it('renders resource details correctly', () => {
    render(<ResourceCard resource={mockResource} canManage={false} isAuthenticated={false} />);
    
    expect(screen.getByText('Test PDF')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
    expect(screen.getByTestId('resource-type-badge')).toHaveTextContent('PDF');
    expect(screen.getByText('1 MB')).toBeInTheDocument();
  });

  it('shows download button only when authenticated', () => {
    // Unauthenticated
    const { rerender } = render(<ResourceCard resource={mockResource} isAuthenticated={false} />);
    expect(screen.getByTestId('download-btn-disabled')).toBeInTheDocument();
    expect(screen.queryByTestId('download-btn')).not.toBeInTheDocument();

    // Authenticated
    rerender(<ResourceCard resource={mockResource} isAuthenticated={true} />);
    expect(screen.getByTestId('download-btn')).toBeInTheDocument();
    expect(screen.queryByTestId('download-btn-disabled')).not.toBeInTheDocument();
  });

  it('shows manage menu only when canManage is true', () => {
    const { rerender } = render(<ResourceCard resource={mockResource} canManage={false} />);
    expect(screen.queryByTestId('manage-dropdown')).not.toBeInTheDocument();

    rerender(<ResourceCard resource={mockResource} canManage={true} />);
    expect(screen.getByTestId('manage-dropdown')).toBeInTheDocument();
  });

  it('calls correct callbacks on actions', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onDownload = vi.fn();

    render(
      <ResourceCard 
        resource={mockResource} 
        canManage={true} 
        isAuthenticated={true} 
        onEdit={onEdit}
        onDelete={onDelete}
        onDownload={onDownload}
      />
    );

    fireEvent.click(screen.getByTestId('download-btn'));
    expect(onDownload).toHaveBeenCalledWith(mockResource);

    fireEvent.click(screen.getByTestId('edit-resource-btn'));
    expect(onEdit).toHaveBeenCalledWith(mockResource);

    fireEvent.click(screen.getByTestId('delete-resource-btn'));
    expect(onDelete).toHaveBeenCalledWith(mockResource);
  });
});
