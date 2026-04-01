import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ModelCard from '../ModelCard';

// Mock navigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate
}));

describe('ModelCard', () => {
  const mockModel = {
    id: 1,
    name: 'Test Model',
    description: 'A test model for unit testing',
    currentVersion: 'v1.0.0',
    ownerName: 'Test Author',
    tags: ['hydrology', 'test'],
    status: 'published',
    runCount: 5,
    ratingAvg: 4.5,
    dockerImage: 'python:3.11',
    visibility: 'public'
  };

  const defaultProps = {
    model: mockModel,
    onClick: jest.fn(),
    onEdit: jest.fn(),
    onDelete: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render model information correctly', () => {
    render(<ModelCard {...defaultProps} />);

    expect(screen.getByText('Test Model')).toBeInTheDocument();
    expect(screen.getByText('A test model for unit testing')).toBeInTheDocument();
    expect(screen.getByText(/v1.0.0/)).toBeInTheDocument();
  });

  it('should render tags', () => {
    render(<ModelCard {...defaultProps} />);

    expect(screen.getByText('hydrology')).toBeInTheDocument();
    expect(screen.getByText('test')).toBeInTheDocument();
  });

  it('should call onClick when card is clicked', () => {
    render(<ModelCard {...defaultProps} />);

    // The card div wraps the whole component; clicking the model name triggers the card's onClick
    fireEvent.click(screen.getByText('Test Model'));

    expect(defaultProps.onClick).toHaveBeenCalledWith(mockModel);
  });

  it('should call onEdit when edit button is clicked', () => {
    render(<ModelCard {...defaultProps} />);

    const editButton = screen.getByText('✏️');
    fireEvent.click(editButton);

    expect(defaultProps.onEdit).toHaveBeenCalledWith(mockModel);
  });

  it('should call onDelete when delete button is clicked', () => {
    render(<ModelCard {...defaultProps} />);

    const deleteButton = screen.getByText('🗑️');
    fireEvent.click(deleteButton);

    expect(defaultProps.onDelete).toHaveBeenCalledWith(mockModel);
  });

  it('should render status badge correctly', () => {
    render(<ModelCard {...defaultProps} />);

    expect(screen.getByText('已发布')).toBeInTheDocument();
  });

  it('should handle model without tags', () => {
    const modelWithoutTags = { ...mockModel, tags: null };
    render(<ModelCard {...defaultProps} model={modelWithoutTags} />);

    expect(screen.getByText('Test Model')).toBeInTheDocument();
  });

  it('should handle model without description', () => {
    const modelWithoutDesc = { ...mockModel, description: null };
    render(<ModelCard {...defaultProps} model={modelWithoutDesc} />);

    expect(screen.getByText('暂无描述')).toBeInTheDocument();
  });
});
